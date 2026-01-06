import { InvalidParametersError } from '@libp2p/interface'
import { peerIdFromString } from '@libp2p/peer-id'

const SUBDOMAIN_GATEWAY_REGEX = /^(?<cidOrPeerIdOrDnsLink>[^/?]+)\.(?<protocol>ip[fn]s)\.([^/?]+)$/

interface SubdomainMatchGroups {
  protocol: 'ipfs' | 'ipns'
  cidOrPeerIdOrDnsLink: string
}

function matchSubdomainGroupsGuard (groups?: null | { [key in string]: string; } | SubdomainMatchGroups): groups is SubdomainMatchGroups {
  const protocol = groups?.protocol

  if (protocol !== 'ipfs' && protocol !== 'ipns') {
    return false
  }

  const cidOrPeerIdOrDnsLink = groups?.cidOrPeerIdOrDnsLink

  if (cidOrPeerIdOrDnsLink == null) {
    return false
  }

  return true
}

// DNS label can have up to 63 characters, consisting of alphanumeric
// characters or hyphens -, but it must not start or end with a hyphen.
const dnsLabelRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/

/**
 * Checks if label looks like inlined DNSLink.
 * (https://specs.ipfs.tech/http-gateways/subdomain-gateway/#host-request-header)
 */
function isInlinedDnsLink (label: string): boolean {
  return dnsLabelRegex.test(label) && label.includes('-') && !label.includes('.')
}

/**
 * DNSLink label decoding
 * - Every standalone - is replaced with .
 * - Every remaining -- is replaced with -
 *
 * @example en-wikipedia--on--ipfs-org -> en.wikipedia-on-ipfs.org
 */
export function decodeDNSLinkLabel (label: string): string {
  return label.replace(/--/g, '%').replace(/-/g, '.').replace(/%/g, '-')
}

/**
 * If the caller has passed a case-sensitive identifier (like a base58btc
 * encoded CID or PeerId) in a case-insensitive location (like a subdomain),
 * be nice and return the original identifier from the passed string
 */
function findOriginalCidOrPeer (needle: string, haystack: URL): string {
  const start = haystack.href.toLowerCase().indexOf(needle)

  if (start === -1) {
    return needle
  }

  return haystack.href.substring(start, start + needle.length)
}

/**
 * Takes a subdomain or path gateway URL and turns it into an IPFS/IPNS URL, or
 * a redirect response that directs the user to a canonical URL for the resource
 */
export function httpResourceToIpfsUrl (resource: URL): URL | Response {
  // test for subdomain gateway URL
  const subdomainMatch = resource.hostname.match(SUBDOMAIN_GATEWAY_REGEX)

  if (matchSubdomainGroupsGuard(subdomainMatch?.groups)) {
    const groups = subdomainMatch.groups

    if (groups.protocol === 'ipns' && isInlinedDnsLink(groups.cidOrPeerIdOrDnsLink)) {
      // decode inline dnslink domain if present
      groups.cidOrPeerIdOrDnsLink = decodeDNSLinkLabel(groups.cidOrPeerIdOrDnsLink)
    }

    const cidOrPeerIdOrDnsLink = findOriginalCidOrPeer(groups.cidOrPeerIdOrDnsLink, resource)

    // parse url as not http(s):// - this is necessary because URL makes
    // `.pathname` default to `/` for http URLs, even if no trailing slash was
    // present in the string URL and we need to be able to round-trip the user's
    // input while also maintaining a sane canonical URL for the resource. Phew.
    const wat = new URL(`not-${resource}`)

    return new URL(`${groups.protocol}://${cidOrPeerIdOrDnsLink}${wat.pathname}${resource.search}${resource.hash}`)
  }

  // test for IPFS path gateway URL
  if (resource.pathname.startsWith('/ipfs/')) {
    const parts = resource.pathname.substring(6).split('/')
    const cid = parts.shift()

    if (cid == null) {
      throw new InvalidParametersError(`Path gateway URL ${resource} had no CID`)
    }

    return new URL(`ipfs://${cid}${resource.pathname.replace(`/ipfs/${cid}`, '')}${resource.search}${resource.hash}`)
  }

  // test for IPNS path gateway URL
  if (resource.pathname.startsWith('/ipns/')) {
    const parts = resource.pathname.substring(6).split('/')
    let name = parts.shift()

    if (name == null) {
      throw new InvalidParametersError(`Path gateway URL ${resource} had no name`)
    }

    // special case - re-encode base58btc IPNS name as base36 CID and redirect
    // @see TestRedirectCanonicalIPNS/GET_for_%2Fipns%2F%7Bb58-multihash-of-ed25519-key%7D_redirects_to_%2Fipns%2F%7Bcidv1-libp2p-key-base36%7D
    if (name.startsWith('12D3K')) {
      const peerId = peerIdFromString(name)
      name = peerId.toCID().toString()

      return new Response('', {
        status: 301,
        headers: {
          location: `/ipns/${name}/${parts.join('/')}${resource.search}${resource.hash}`
        }
      })
    }

    return new URL(`ipns://${name}${resource.pathname.replace(`/ipns/${name}`, '')}${resource.search}${resource.hash}`)
  }

  throw new TypeError(`Invalid URL: ${resource}, please use subdomain or path gateway URLs only`)
}
