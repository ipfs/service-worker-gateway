// Cloudflare Snippet: shared service worker installer cache
//
// What this snippet does
//
// The service worker gateway serves a small HTML installer on every
// subdomain. The installer registers a service worker that handles
// all subsequent navigation. The page is the same for every URL on
// every subdomain. Versioned JS/CSS assets (paths starting with
// /ipfs-sw-) are also the same on every subdomain.
//
// Two cache branches, both with a 24h TTL:
//
//   /ipfs-sw-* (versioned assets)
//     cache key normalized to the base domain, so all subdomains
//     share one edge entry.
//
//   everything else (the installer page)
//     cache key normalized to one entry per subdomain.
//
// HTML and asset TTLs are both 24h, but note that equal TTLs are
// not synchronized expiry: the two entries are written whenever
// they are first requested, so they drift apart by however long
// separates those requests. In #1155 the HTML entry was written
// two and a half hours after the asset entry. What keeps a stale
// HTML from naming an asset that is gone is that a missing asset
// 404s (see below), not that the numbers match. Badbits is
// enforced by purging the whole subdomain, so a long TTL does not
// delay takedowns.
//
// Why we rewrite the upstream URL for the installer branch
//
// The cache key collapses every non-asset URL on a subdomain into
// one entry. That only works if origin returns the same response
// for every URL. Origin can also return path specific responses
// (a _redirects file, a trailing slash redirect, a content
// negotiated codec redirect, a 404 body). Any one of those would
// then be served back under every URL on the subdomain.
//
// In production we saw a transient 308 from origin get pinned for
// 24 hours at one Cloudflare PoP and put a whole subdomain into a
// redirect loop. To keep the cache key honest we ignore the
// requested URL and always fetch "/" with Accept: text/html and
// redirect: manual. The browser keeps the originally requested URL
// in window.location, so client side SPA routing still works once
// the installer JS runs.
//
// Why we cache only 2xx
//
// cacheEverything: true overrides the origin Cache-Control header,
// so this snippet owns the cache decision. We only cache 200-299.
// 3xx, 4xx and 5xx are not cached so a transient origin response
// cannot get pinned for the full 24 hour TTL.
//
// Why the asset branch also checks the content type
//
// A status of 200 is not enough to tell a real asset from a missing
// one, because an origin can answer a file it does not have with
// the installer HTML and a 200. Every origin we ship now returns a
// real 404 instead: Pages because public/_redirects no longer has a
// catch-all, main.go and the dev server because they special case
// the /ipfs-sw- prefix. cacheTtlByStatus only ever sees the status,
// so a 404 is enough to keep it out of the cache and this check
// should never fire.
//
// It stays because "should never" has already been wrong once, in
// #1155. A deploy cutover raced a request for a freshly hashed
// chunk. Origin did not have it yet, answered 200 text/html, and
// the edge pinned that HTML for 24 hours under the shared base
// domain key, five seconds after the deploy's cache purge had
// emptied it. Every subdomain then served HTML where a .js file
// belonged. Browsers reject a module on its MIME type, the
// installer read that as "a new version shipped" and reloaded, and
// the reload storm rate limited us.
//
// Two things keep that from recurring. The origin no longer lies,
// and if one ever does again, this branch refuses to pass the lie
// on. The deployment being replaced during a cutover is itself an
// origin that may still have the old catch-all, so the window is
// real on the very deploy that removes it.
//
// The build never emits HTML under /ipfs-sw-, so a text/html body
// on an asset path always means the file is missing. When we see
// one we go back to origin with `cache: 'no-store'`, the one option
// that skips the cache read rather than just the write. If the
// deploy has since settled we serve the real asset, so a poisoned
// entry costs an extra origin fetch rather than a day of downtime,
// and it heals without waiting for a purge that may never run: the
// purge is a step in a workflow, and that workflow gets cancelled.
// If origin still does not have the file we answer 404, which is
// honest and, unlike HTML, cannot be mistaken for a script.
//
// We cannot stop a poisoned entry being written in the first place.
// cf.cacheTtlByStatus decides on status alone, before the snippet
// ever sees the response. Owning the entry through the Cache API
// instead would mean buffering the body to call cache.put, and the
// built chunks and their source maps run to several MB against a
// 2 MB snippet memory limit. So we let the entry exist and refuse
// to serve it.
//
// Worst case, if a runtime ever ignored `cache: 'no-store'`, the
// retry reads the poisoned entry again and we answer 404 until the
// TTL lapses or a purge lands. That is a bad day, but it is a 404
// rather than HTML masquerading as a script, so the installer shows
// an error instead of reloading itself into a rate limit.

const EDGE_CACHE_TTL_S = 86400 // 24h

/**
 * Whether a response body is really a versioned asset.
 *
 * Only the headers are inspected, never the body: assets here reach several MB
 * and a snippet gets 2 MB of memory, so everything has to stream through.
 *
 * A missing file arrives as the installer page with a 200, and the build emits
 * only JS, CSS, source maps and images under /ipfs-sw-, so text/html on an
 * asset path means the file is gone. A response with no content type is not
 * trusted either, since there is nothing to tell it apart from that fallback.
 */
function isAssetResponse (response: Response): boolean {
  if (!response.ok) {
    return false
  }

  const contentType = response.headers.get('content-type')

  return contentType != null && !contentType.startsWith('text/html')
}

/** A missing asset, marked so nothing downstream keeps it. */
function notFound (): Response {
  return new Response(null, {
    status: 404,
    headers: { 'cache-control': 'no-store' }
  })
}

export default {
  async fetch (request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname.startsWith('/ipfs-sw-')) {
      const baseDomain = url.hostname.split('.').slice(-2).join('.')
      const cacheKey = `https://${baseDomain}${url.pathname}`

      // redirect: manual matches the installer branch. With the
      // default redirect: follow, an origin 3xx on an asset path
      // would be followed and the target's 2xx body would land in
      // cache under the asset cacheKey, serving wrong content.
      // cacheTtlByStatus 300-599: 0 only drops the 3xx itself,
      // not the followed 2xx.
      const assetReq = new Request(request, { redirect: 'manual' })

      const response = await fetch(assetReq, {
        cf: {
          cacheEverything: true,
          cacheKey,
          cacheTtlByStatus: {
            '200-299': EDGE_CACHE_TTL_S,
            // Do not cache errors. A transient failure must not be stuck
            // in cache for the full TTL.
            '300-599': 0
          }
        }
      })

      if (isAssetResponse(response)) {
        return response
      }

      // A real 3xx/4xx/5xx from origin, already kept out of cache by
      // cacheTtlByStatus. Pass it through as-is.
      if (!response.ok) {
        return response
      }

      // A 2xx that is not an asset: the shared entry, or origin itself, is
      // handing back the installer page for a file that does not exist. Ask
      // origin again with the cache out of the way.
      //
      // `cache: 'no-store'` is the only thing that skips the cache read. It
      // has to, because on the base domain the request URL is byte-for-byte
      // the shared cacheKey, so a plain re-fetch would be answered by the
      // poisoned entry we are trying to get around. `cf.cacheTtl: 0` does not
      // help: it expires the entry it writes, it does not bypass the lookup.
      const fresh = await fetch(new Request(request, {
        redirect: 'manual',
        cache: 'no-store'
      }))

      if (isAssetResponse(fresh)) {
        return fresh
      }

      return notFound()
    }

    // The installer branch handles GET and HEAD only. Other
    // methods (POST, OPTIONS, etc.) pass through untouched: they
    // must not be rewritten to "/" and must not share the
    // installer cache entry.
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return fetch(request)
    }

    // Ignore the requested path. Always fetch the canonical
    // installer URL ("/") with Accept: text/html and
    // redirect: manual. This guarantees the collapsed cache key
    // can never be populated with a path specific origin response.
    // HEAD is rewritten the same way as GET; Cloudflare serves
    // HEAD responses from the matching GET cache entry.
    const installerUrl = new URL('/', url).toString()
    const installerReq = new Request(installerUrl, {
      method: request.method,
      headers: { Accept: 'text/html' },
      redirect: 'manual'
    })

    return fetch(installerReq, {
      cf: {
        cacheEverything: true,
        cacheKey: `https://${url.hostname}/__sw_installer_html`,
        cacheTtlByStatus: {
          '200-299': EDGE_CACHE_TTL_S,
          // Do not cache errors. A transient failure must not be stuck
          // in cache for the full TTL.
          '300-599': 0
        }
      }
    })
  }
}
