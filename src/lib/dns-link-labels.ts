import { CID } from 'multiformats/cid'

/**
 * For dnslinks see https://specs.ipfs.tech/http-gateways/subdomain-gateway/#host-request-header
 * DNSLink names include . which means they must be inlined into a single DNS label to provide unique origin and work with wildcard TLS certificates.
 */

// DNS label can have up to 63 characters, consisting of alphanumeric
// characters or hyphens -, but it must not start or end with a hyphen.
const dnsLabelRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/

/**
 * We can receive either IPNS Name string or DNSLink label string here.
 * IPNS Names do not have dots or dashes.
 */
export function isValidDnsLabel (label: string): boolean {
  // If string is not a valid IPNS Name (CID)
  // then we assume it may be a valid DNSLabel.
  try {
    CID.parse(label)
    return false
  } catch {
    return dnsLabelRegex.test(label)
  }
}

/**
 * Checks if label looks like inlined DNSLink.
 * (https://specs.ipfs.tech/http-gateways/subdomain-gateway/#host-request-header)
 */
export function isInlinedDnsLink (label: string): boolean {
  return isValidDnsLabel(label) && label.includes('-') && !label.includes('.')
}

/**
 * DNSLink label decoding
 * * Every standalone - is replaced with .
 * * Every remaining -- is replaced with -
 *
 * @example en-wikipedia--on--ipfs-org.ipns.example.net -> example.net/ipns/en.wikipedia-on-ipfs.org
 */
export function dnsLinkLabelDecoder (linkLabel: string): string {
  return linkLabel.replace(/--/g, '%').replace(/-/g, '.').replace(/%/g, '-')
}

/**
 * DNSLink label encoding:
 * * Every - is replaced with --
 * * Every . is replaced with -
 *
 * @example example.net/ipns/en.wikipedia-on-ipfs.org → Host: en-wikipedia--on--ipfs-org.ipns.example.net
 */
export function dnsLinkLabelEncoder (linkLabel: string): string {
  return linkLabel.replace(/-/g, '--').replace(/\./g, '-')
}
