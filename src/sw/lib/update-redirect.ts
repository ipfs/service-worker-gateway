import { dnsLinkLabelEncoder } from '../../lib/dns-link-labels.ts'
import { matchSubdomainGroupsGuard, SUBDOMAIN_GATEWAY_REGEX } from './resource-to-url.ts'

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

  // match host to include port (if present)
  const subdomainMatch = resource.host.match(SUBDOMAIN_GATEWAY_REGEX)

  if (matchSubdomainGroupsGuard(subdomainMatch?.groups)) {
    const { host } = subdomainMatch.groups

    let hostname = url.hostname

    if (url.protocol === 'ipns:') {
      hostname = dnsLinkLabelEncoder(hostname)
    }

    location = `${resource.protocol}//${hostname}.${url.protocol.replace(':', '')}.${host}${url.pathname}${url.search}${url.hash}`
  } else {
    location = `${resource.protocol}//${resource.host}/${url.protocol.replace(':', '')}/${url.hostname}${url.pathname}${url.search}${url.hash}`
  }

  response.headers.set('location', location)

  return response
}
