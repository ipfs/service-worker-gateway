/**
 * DNSLink label encoding
 *
 * @see https://specs.ipfs.tech/http-gateways/subdomain-gateway/#host-request-header
 */
export function dnsLinkEncode (domain: string): string {
  return domain.replace(/-/g, '--').replace(/\./g, '-')
}

/**
 * Inverse of `dnsLinkEncode`: `en-wikipedia--on--ipfs-org` becomes
 * `en.wikipedia-on-ipfs.org`
 */
export function dnsLinkDecode (label: string): string {
  return label.replace(/--/g, '\0').replace(/-/g, '.').replace(/\0/g, '-')
}
