/**
 * For dnslinks see https://specs.ipfs.tech/http-gateways/subdomain-gateway/#host-request-header
 * DNSLink names include . which means they must be inlined into a single DNS label to provide unique origin and work with wildcard TLS certificates.
 */

/**
 * We can receive either a peerId string or dnsLink label string here. PeerId strings do not have dots or dashes.
 */
export function isDnsLabel (label: string): boolean {
  return ['-', '.'].some((char) => label.includes(char))
}

/**
 * DNSLink label decoding
 * * Every standalone - is replaced with .
 * * Every remaining -- is replaced with -
 *
 * @example en-wikipedia--on--ipfs-org.ipns.example.net -> example.net/ipns/en.wikipedia-on-ipfs.org
 */
export function dnsLinkLabelDecoder (linkLabel: string): string {
  return linkLabel.replace(/--/g, '-').replace(/-/g, '.')
}

/**
 * DNSLink label encoding:
 * * Every - is replaced with --
 * * Every . is replaced with -
 *
 * @example example.net/ipns/en.wikipedia-on-ipfs.org → Host: en-wikipedia--on--ipfs-org.ipns.example.net
 */
export function dnsLinkLabelEncoder (linkLabel: string): string {
  return linkLabel.replace(/\./g, '-').replace(/-/g, '--')
}
