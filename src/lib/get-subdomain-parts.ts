import { dnsLinkLabelDecoder, isInlinedDnsLink } from './dns-link-labels.js'

export interface UrlParts {
  /**
   * The CID or DNSLink name or peer ID.
   *
   * e.g. `bafyfoo` for `bafyfoo.ipfs.example.com`
   */
  id: string | null

  /**
   * The protocol of the subdomain.
   *
   * e.g. `ipfs` for `bafyfoo.ipfs.example.com` or `ipns` for `bafyfoo.ipns.example.com`
   */
  protocol: string | null

  /**
   * The parent domain of the subdomain.
   *
   * e.g. `example.com` for `bafyfoo.ipfs.example.com`
   */
  parentDomain: string
}

export function getSubdomainParts (urlString: string): UrlParts {
  const url = new URL(urlString)
  const labels = url.host.split('.')
  let id: string | null = null
  let protocol: string | null = null
  let parentDomain: string = url.host

  // DNS label inspection happens from from right to left
  // to work fine with edge cases like docs.ipfs.tech.ipns.foo.localhost
  for (let i = labels.length - 1; i >= 0; i--) {
    if (labels[i].startsWith('ipfs') || labels[i].startsWith('ipns')) {
      protocol = labels[i]
      id = labels.slice(0, i).join('.')
      parentDomain = labels.slice(i + 1).join('.')
      if (protocol === 'ipns' && isInlinedDnsLink(id)) {
        // un-inline DNSLink names according to https://specs.ipfs.tech/http-gateways/subdomain-gateway/#host-request-header
        id = dnsLinkLabelDecoder(id)
      }
      break
    }
  }

  return {
    id,
    parentDomain,
    protocol
  }
}
