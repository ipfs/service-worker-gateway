export interface IpfsUriParts {
  protocol: 'ipfs' | 'ipns'
  cidOrPeerIdOrDnslink: string
  path?: string
  parentDomain?: string
}

/**
 * `http[s]://${cid}.ipfs.example.com[/${path}]`
 * `http[s]://${dnsLinkDomain}.ipns.example.com[/${path}]`
 * `http[s]://${peerId}.ipns.example.com[/${path}]`
 *
 * @see https://regex101.com/r/EcY028/4
 */
export const subdomainRegex = /^(?:https?:\/\/|\/\/)?(?<cidOrPeerIdOrDnslink>[^/]+)\.(?<protocol>ip[fn]s)\.(?<parentDomain>[^/?#]*)(?<path>.*)$/

/**
 * `http[s]://example.com/ipfs/${cid}[/${path}]`
 * `/ipfs/${cid}[/${path}]`
 * `/ipns/${dnsLinkDomain}[/${path}]`
 * `/ipns/${peerId}[/${path}]`
 *
 * @see https://regex101.com/r/zdDp0i/1
 */
export const pathRegex = /^.*\/(?<protocol>ip[fn]s)\/(?<cidOrPeerIdOrDnslink>[^/?#]*)(?<path>.*)$/

/**
 * `ip[fn]s://${cidOrPeerIdOrDnslink}${path}`
 */
export const nativeProtocolRegex = /^(?<protocol>ip[fn]s):\/\/(?<cidOrPeerIdOrDnslink>[^/?#]*)(?<path>.*)$/
