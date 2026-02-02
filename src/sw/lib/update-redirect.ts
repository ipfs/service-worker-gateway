import { parseRequest } from '../../lib/parse-request.ts'
import { getGatewayRoot } from '../../lib/to-gateway-root.ts'

/**
 * If the response has a location header with an ipfs/ipns URL, translate it
 * into a HTTP URL that a browser can use
 */
export function updateRedirect (resource: URL, response: Response): Response {
  let location = response.headers.get('location')

  if (location == null || location.trim() === '') {
    return response
  }

  if (location.startsWith('?') || location.startsWith('/') || location.startsWith('#')) {
    // partial location, prefix with current origin
    location = `${resource.href}${location}`
  }

  const url = new URL(location)

  if (url.protocol.startsWith('http')) {
    return response
  }

  const request = parseRequest(url, new URL(getGatewayRoot()))

  if (request.type === 'subdomain' || request.type === 'path' || request.type === 'native') {
    location = request.subdomainURL.href
  } else if (request.type === 'internal' || request.type === 'external') {
    location = request.url.href
  }

  response.headers.set('location', location)

  return response
}
