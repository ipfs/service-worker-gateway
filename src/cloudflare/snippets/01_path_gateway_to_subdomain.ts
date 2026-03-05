// Cloudflare Snippet: IPFS/IPNS path gateway to subdomain gateway redirect
//
// Redirects path gateway URLs to subdomain gateway URLs with CID normalization
// per https://specs.ipfs.tech/http-gateways/subdomain-gateway/
//
// /ipfs/{cid}[/path][?query] -> {base32-cidv1}.ipfs.{host}[/path][?query]
// /ipns/{peerid}[/path][?query] -> {base36-cidv1}.ipns.{host}[/path][?query]
// /ipns/{domain}[/path][?query] -> {dnslink-encoded}.ipns.{host}[/path][?query]

import { toSubdomain } from './subdomain.ts'

export default {
  /**
   * main fetch handler
   *
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async fetch (request: Request): Promise<Response> {
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

    const remainingPath = '/' + segments.slice(3).join('/')

    const subdomain = toSubdomain(identifier, namespace)

    if (subdomain == null) {
      return fetch(request)
    }

    const redirectUrl = `${url.protocol}//${subdomain}.${namespace}.${url.host}${remainingPath}${url.search}`

    return new Response(null, {
      status: 301,
      headers: {
        Location: redirectUrl,
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    })
  }
}
