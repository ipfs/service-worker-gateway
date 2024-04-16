export interface IpfsUriParts {
  protocol: 'ipfs' | 'ipns'
  cidOrPeerIdOrDnslink: string
  path?: string
}

/**
 * `http[s]://${cid}.ipfs.example.com[/${path}]`
 * `http[s]://${dnsLinkDomain}.ipns.example.com[/${path}]`
 * `http[s]://${peerId}.ipns.example.com[/${path}]`
 */
export const subdomainRegex = /^(?:https?:\/\/)?(?<cidOrPeerIdOrDnslink>[^/]+)\.(?<protocol>ip[fn]s)\.(?<parentDomain>[^/]*)(?<path>\/?.*)$$/

/**
 * `http[s]://example.com/ipfs/${cid}[/${path}]`
 * `/ipfs/${cid}[/${path}]`
 * `/ipns/${dnsLinkDomain}[/${path}]`
 * `/ipns/${peerId}[/${path}]`
 */
export const pathRegex = /^.*\/(?<protocol>ip[fn]s)\/(?<cidOrPeerIdOrDnslink>[^/]*)(?<path>.*)$/
