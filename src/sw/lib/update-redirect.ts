import { parseRequest } from '../../lib/parse-request.ts'

/**
 * If the response has a location header with an ipfs/ipns URL, translate it
 * into a HTTP URL that a browser can use
 */
export function updateRedirect (origin: URL, gatewayRoot: URL, response: Response): Response {
  let location = response.headers.get('location')?.trim()

  if (location == null || location === '') {
    return response
  }

  if (location.startsWith('?') || location.startsWith('/') || location.startsWith('#')) {
    // partial location, prefix with current origin
    location = `${origin.href}${location}`
  }

  let redirect = new URL(location)
  const request = parseRequest(redirect, gatewayRoot)

  if (request.type === 'subdomain' || request.type === 'path' || request.type === 'native') {
    redirect = request.subdomainURL
  } else if (request.type === 'internal' || request.type === 'external') {
    redirect = request.url
  }

  if (redirect.host === origin.host) {
    location = redirect.pathname
  } else {
    location = redirect.toString()
  }

  response.headers.set('location', location)

  return response
}
