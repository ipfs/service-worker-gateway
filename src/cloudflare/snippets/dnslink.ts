/**
 * DNSLink label encoding
 *
 * @see https://specs.ipfs.tech/http-gateways/subdomain-gateway/#host-request-header
 */
export function dnsLinkEncode (domain: string): string {
  return domain.replace(/-/g, '--').replace(/\./g, '-')
}
