// Cloudflare Snippet: IPFS/IPNS path gateway to subdomain gateway redirect
//
// Redirects path gateway URLs to subdomain gateway URLs with CID normalization
// per https://specs.ipfs.tech/http-gateways/subdomain-gateway/
//
// /ipfs/{cid}[/path][?query] -> {base32-cidv1}.ipfs.{host}[/path][?query]
// /ipns/{peerid}[/path][?query] -> {base36-cidv1}.ipns.{host}[/path][?query]
// /ipns/{domain}[/path][?query] -> {dnslink-encoded}.ipns.{host}[/path][?query]
//
// Edge cache: the transformation is fully deterministic per source URL
// (CIDs are content-addressed, peer IDs and DNSLink labels are decoded and
// re-encoded by a fixed algorithm), so we cache the 301 at the Cloudflare
// edge keyed by the source URL. Subsequent hits skip CID parsing and the
// multibase work entirely.
//
// Strip __cf_* query params before computing the cache key and the redirect
// Location. Visitors that just passed a Managed Challenge arrive on a URL
// carrying a single-use challenge token; without stripping, each per-visitor
// URL becomes its own cache entry (no shared hit) and the token propagates
// onto the subdomain where snippet 02 has to clean it up with another hop.
// Prefix-matching the whole __cf_* namespace stays robust to Cloudflare-
// internal additions inside that namespace.

import { toSubdomain } from './subdomain.ts'

const CF_QUERY_PARAM_PREFIX = '__cf_'

export default {
  /**
   * main fetch handler
   *
   * @param {Request} request
   * @param {unknown} env
   * @param {ExecutionContext} ctx
   * @returns {Promise<Response>}
   */
  async fetch (request: Request, env: unknown, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    if (!path.startsWith('/ipfs/') && !path.startsWith('/ipns/')) {
      return fetch(request)
    }

    const segments = path.split('/')
    // segments: ['', 'ipfs'|'ipns', identifier, ...rest]
    const namespace = segments[1]
    const identifier = segments[2]

    if (identifier == null) {
      return fetch(request)
    }

    // Strip __cf_* params before anything that touches the cache or the
    // redirect target. Mirrors the hygiene applied in snippet 02.
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith(CF_QUERY_PARAM_PREFIX)) {
        url.searchParams.delete(key)
      }
    }

    // Use the stripped URL as the cache key. Default Cache API behavior keys
    // by request URL, which gives unique-per-source-URL entries for free.
    // `caches.default` is the Cloudflare-specific per-datacenter cache; the
    // cast bridges the gap with the standard lib.dom CacheStorage shape that
    // tsc resolves to first.
    const cacheKey = url.toString()
    const cache = (caches as unknown as { default: Cache }).default
    const cached = await cache.match(cacheKey)
    if (cached != null) {
      return cached
    }

    const subdomain = toSubdomain(identifier, namespace)

    if (subdomain == null) {
      return fetch(request)
    }

    const remainingPath = '/' + segments.slice(3).join('/')
    const redirectUrl = `${url.protocol}//${subdomain}.${namespace}.${url.host}${remainingPath}${url.search}`

    const response = new Response(null, {
      status: 301,
      headers: {
        Location: redirectUrl,
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    })

    // Cache write runs after the response is sent. The Cache API honors
    // Cache-Control on the stored response, so the edge TTL matches the
    // 1-year immutable browser TTL set above.
    ctx.waitUntil(cache.put(cacheKey, response.clone()))

    return response
  }
}
