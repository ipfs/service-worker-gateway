// Cloudflare Snippet: shared service worker installer cache
//
// Controls edge and browser caching for the service worker gateway.
// All subdomains serve the same HTML+JS service worker installer, so
// versioned SW assets can share a single cache entry across subdomains.
//
// /ipfs-sw-* paths (versioned SW assets):
//   - normalized cache key (base domain) so subdomains share edge cache
//   - 24h edge TTL (assets only change on deploy)
//
// Everything else:
//   - default cache key (per-subdomain, so badbits 410s are per-CID)
//   - 5-minute edge TTL so badbits enforcement at the origin takes
//     effect within 5 minutes of a CID being blocked

export default {
  async fetch (request) {
    const url = new URL(request.url)

    if (url.pathname.startsWith('/ipfs-sw-')) {
      // Versioned service worker assets are identical across all subdomains.
      // Normalize cache key to base domain so they share a single edge cache
      // entry, and cache for 24h (86400s) since they only change on deploy.
      const baseDomain = url.hostname.split('.').slice(-2).join('.')
      const cacheKey = `https://${baseDomain}${url.pathname}`

      return fetch(request, {
        cf: {
          cacheEverything: true,
          cacheKey,
          cacheTtlByStatus: {
            '200-299': 86400,
            // Do not cache errors for SW assets -- a transient failure
            // should not be stuck in cache for 24h.
            '300-599': 0
          }
        }
      })
    }

    // Everything else: use default cache key (includes full hostname, so
    // each subdomain caches independently). Use 5-minute TTL (300s) so
    // badbits enforcement at the origin takes effect within 5 minutes
    // of a CID being blocked. Caching 300s is fine here -- these are
    // redirects from path_gateway_to_subdomain snippet or the origin.
    return fetch(request, {
      cf: {
        cacheEverything: true,
        cacheTtlByStatus: {
          '200-399': 300,
          // Do not cache client/server errors -- a transient failure
          // should not be stuck in cache.
          '400-599': 0
        }
      }
    })
  }
}
