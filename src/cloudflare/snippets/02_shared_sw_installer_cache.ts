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
// HTML and asset TTLs match on purpose: a stale HTML referencing
// fresh JS (or vice versa) would mismatch and break the installer.
// Badbits is enforced by purging the whole subdomain, so a long
// TTL does not delay takedowns.
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

const EDGE_CACHE_TTL_S = 86400 // 24h

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

      return fetch(assetReq, {
        cf: {
          cacheEverything: true,
          cacheKey,
          cacheTtlByStatus: {
            '200-299': EDGE_CACHE_TTL_S,
            '300-599': 0
          }
        }
      })
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
          '300-599': 0
        }
      }
    })
  }
}
