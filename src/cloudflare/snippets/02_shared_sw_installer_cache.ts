// Cloudflare Snippet: shared service worker installer cache
//
// Controls edge caching for the service worker gateway. Every subdomain
// serves the same installer HTML and the same versioned JS/CSS.
//
// /ipfs-sw-* (versioned SW assets):
//   Cache key normalized to base domain. Identical bytes across all
//   subdomains share one edge entry.
//
// Everything else (SPA fallback to index.html at origin):
//   Cache key normalized per subdomain. Origin returns the same installer
//   HTML for any non-asset path, so the long tail of arbitrary URLs
//   collapses to one entry per hostname. Badbits enforcement uses a manual
//   purge of the whole subdomain, so edge TTL does not gate how fast a
//   blocked CID stops being served.
//
// HTML and versioned JS/CSS share the same TTL on purpose: a stale HTML
// entry referencing fresh JS (or vice versa) could mismatch and break
// the installer.
//
// Strip __cf_* query params at the edge: after a visitor passes a Managed
// Challenge, Cloudflare lands them on a URL carrying a single-use token
// (__cf_chl_tk, __cf_chl_f_tk, __cf_chl_rt_tk). If that token survives
// into the SW installer reload, Cloudflare sees it replayed and issues a
// fresh challenge, looping forever. We strip every __cf_* param and 302
// to the clean URL, so the browser address bar never carries challenge
// state. The prefix match covers today's names and any future Cloudflare
// additions in the same namespace.

const EDGE_CACHE_TTL_S = 86400 // 24h
const CF_QUERY_PARAM_PREFIX = '__cf_'

export default {
  async fetch (request: Request): Promise<Response> {
    const url = new URL(request.url)

    // Strip __cf_* params before any cache lookup so the per-visitor URL
    // never becomes a cache key and the address bar never persists a
    // single-use token.
    let strippedCfParam = false
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith(CF_QUERY_PARAM_PREFIX)) {
        url.searchParams.delete(key)
        strippedCfParam = true
      }
    }
    if (strippedCfParam) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: url.toString(),
          // The source URL holds a single-use, per-visitor token. Do not
          // cache the redirect anywhere.
          'Cache-Control': 'no-store'
        }
      })
    }

    if (url.pathname.startsWith('/ipfs-sw-')) {
      const baseDomain = url.hostname.split('.').slice(-2).join('.')
      const cacheKey = `https://${baseDomain}${url.pathname}`

      return fetch(request, {
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
    }

    const cacheKey = `https://${url.hostname}/__sw_installer_html`

    return fetch(request, {
      cf: {
        cacheEverything: true,
        cacheKey,
        cacheTtlByStatus: {
          '200-399': EDGE_CACHE_TTL_S,
          // Do not cache errors. A transient failure must not be stuck
          // in cache for the full TTL.
          '400-599': 0
        }
      }
    })
  }
}
