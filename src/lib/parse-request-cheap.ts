import { isIP } from '@chainsafe/is-ip'
import { cidV1Bytes, parseCID } from '../cloudflare/snippets/cid.ts'
import { base32Encode, base36Encode } from '../cloudflare/snippets/codec.ts'
import { dnsLinkLabelDecoder, dnsLinkLabelEncoder, isInlinedDnsLink } from './dns-link-labels.ts'

export type URIType = 'subdomain' | 'path' | 'native' | 'internal' | 'external'

/**
 * A request for a CID
 */
export interface IPFSURI {
  protocol: 'ipfs'
  type: 'subdomain' | 'path' | 'native'
  subdomainURL: URL
  pathURL: URL
  nativeURL: URL
}

/**
 * A request for a public key
 */
export interface IPNSURI {
  protocol: 'ipns'
  type: 'subdomain' | 'path' | 'native'
  subdomainURL: URL
  pathURL: URL
  nativeURL: URL
}

/**
 * A request for a DNSLink domain
 */
export interface DNSLinkURI {
  protocol: 'dnslink'
  type: 'subdomain' | 'path' | 'native'
  domain: string
  subdomainURL: URL
  pathURL: URL
  nativeURL: URL
}

/**
 * A request for a service worker gateway page
 */
export interface InternalURI {
  url: URL
  type: 'internal'
}

/**
 * A request for a third party web resource
 */
export interface ExternalURI {
  url: URL
  type: 'external'
}

export type ContentURI = IPFSURI | IPNSURI | DNSLinkURI

export type ResolvableURI = IPFSURI | IPNSURI | DNSLinkURI | InternalURI | ExternalURI

const SUBDOMAIN_IPFS = '.ipfs.'
const SUBDOMAIN_IPNS = '.ipns.'

function toIPFSURI (type: 'subdomain' | 'path' | 'native', cidStr: string, host: string, pathname: string, search: string, hash: string, root: URL): IPFSURI | undefined {
  if (cidStr == null || cidStr === '') {
    return
  }

  let cid: string

  try {
    const parsed = parseCID(cidStr)
    const v1 = parsed.version === 0 ? cidV1Bytes(parsed.codec, parsed.multihash) : parsed.raw

    cid = `b${base32Encode(v1)}`
  } catch (err) {
    // e.g. throw if url was http://localhost/ipfs/invalid but not if it was
    // http://example.com/ipfs/invalid
    if (host === root.host) {
      throw err
    }

    return
  }

  const output: IPFSURI = {
    type,
    protocol: 'ipfs',
    subdomainURL: new URL(`${root.protocol}//${cid}.ipfs.${root.host}${pathname}${search}${hash}`),
    pathURL: new URL(`${root.protocol}//${root.host}/ipfs/${cidStr}${pathname}${search}${hash}`),
    nativeURL: new URL(`ipfs://${cidStr}${pathname}${search}${hash}`)
  }

  return output
}

function toIPNSURI (type: 'subdomain' | 'path' | 'native', peerIdStr: string, pathname: string, search: string, hash: string, root: URL): IPNSURI | undefined {
  if (peerIdStr == null || peerIdStr === '') {
    return
  }

  const peerId = parsePeerId(peerIdStr)
  const output: IPNSURI = {
    type,
    protocol: 'ipns',
    subdomainURL: new URL(`${root.protocol}//${peerId}.ipns.${root.host}${pathname}${search}${hash}`),
    pathURL: new URL(`${root.protocol}//${root.host}/ipns/${peerIdStr}${pathname}${search}${hash}`),
    nativeURL: new URL(`ipns://${peerIdStr}${pathname}${search}${hash}`)
  }

  return output
}

function toDNSLinkURI (type: 'subdomain' | 'path' | 'native', domain: string, pathname: string, search: string, hash: string, root: URL): DNSLinkURI | undefined {
  const output: DNSLinkURI = {
    type,
    protocol: 'dnslink',
    domain,
    subdomainURL: new URL(`${root.protocol}//${dnsLinkLabelEncoder(domain)}.ipns.${root.host}${pathname}${search}${hash}`),
    pathURL: new URL(`${root.protocol}//${root.host}/ipns/${domain}${pathname}${search}${hash}`),
    nativeURL: new URL(`ipns://${domain}${pathname}${search}${hash}`)
  }

  return output
}

function asSubdomainMatch (url: URL, root: URL): ResolvableURI | undefined {
  // only http
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return
  }

  // only domains
  if (isIP(url.hostname)) {
    return
  }

  const ipfsIndex = url.host.indexOf(SUBDOMAIN_IPFS)

  if (ipfsIndex !== -1) {
    const [
      cidStr,
      host
    ] = url.host.split(SUBDOMAIN_IPFS)

    return toIPFSURI(
      'subdomain',
      cidStr,
      host,
      url.pathname,
      url.search,
      url.hash,
      root
    )
  }

  const ipnsIndex = url.hostname.indexOf(SUBDOMAIN_IPNS)

  if (ipnsIndex !== -1) {
    const [
      peerIdOrDNSLink
    ] = url.host.split(SUBDOMAIN_IPNS)

    try {
      return toIPNSURI(
        'subdomain',
        peerIdOrDNSLink,
        url.pathname,
        url.search,
        url.hash,
        root
      )
    } catch {
      if (!isInlinedDnsLink(peerIdOrDNSLink)) {
        return
      }

      const domain = dnsLinkLabelDecoder(peerIdOrDNSLink)

      return toDNSLinkURI(
        'subdomain',
        domain,
        url.pathname,
        url.search,
        url.hash,
        root
      )
    }
  }
}

function asPathMatch (url: URL, root: URL): ResolvableURI | undefined {
  // only http
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return
  }

  if (url.pathname.startsWith('/ipfs')) {
    const [
      ,, cidStr, ...rest
    ] = url.pathname.split('/')

    return toIPFSURI(
      'path',
      cidStr,
      url.host,
      `/${rest.join('/')}`,
      url.search,
      url.hash,
      root
    )
  }

  if (url.pathname.startsWith('/ipns')) {
    const [
      ,, peerIdOrDNSLink, ...rest
    ] = url.pathname.split('/')
    const path = `/${rest.join('/')}`

    try {
      return toIPNSURI(
        'path',
        peerIdOrDNSLink,
        path,
        url.search,
        url.hash,
        root
      )
    } catch {
      return toDNSLinkURI(
        'path',
        peerIdOrDNSLink,
        path,
        url.search,
        url.hash,
        root
      )
    }
  }
}

function asNativeMatch (url: URL, root: URL): ResolvableURI | undefined {
  if (url.protocol === 'ipfs:') {
    return toIPFSURI(
      'native',
      url.hostname,
      '',
      url.pathname,
      url.search,
      url.hash,
      root
    )
  }

  if (url.protocol === 'ipns:') {
    try {
      return toIPNSURI(
        'native',
        url.hostname,
        url.pathname,
        url.search,
        url.hash,
        root
      )
    } catch {
      return toDNSLinkURI(
        'native',
        url.hostname,
        url.pathname,
        url.search,
        url.hash,
        root
      )
    }
  }
}

function asInternalOrExternalURI (url: URL, root: URL): ResolvableURI {
  return {
    url,
    type: url.host === root.host ? 'internal' : 'external'
  }
}

function parsePeerId (str: string): string {
  if (str.includes('.')) {
    throw new Error('Probably a domain name?')
  }

  const parsed = parseCID(str)
  const v1 = cidV1Bytes(0x72, parsed.multihash)

  return 'k' + base36Encode(v1)
}

export function parseRequest (url: URL | string, root: URL): ResolvableURI {
  if (url instanceof String || typeof url === 'string') {
    if (url.startsWith('/ipfs/')) {
      url = new URL(`ipfs://${url.substring('/ipfs/'.length)}`)
    } else if (url.startsWith('/ipns/')) {
      url = new URL(`ipns://${url.substring('/ipns/'.length)}`)
    } else {
      url = new URL(url)
    }
  }

  if (root.host.includes(SUBDOMAIN_IPFS)) {
    root = new URL(`${root.protocol}//${root.host.split(SUBDOMAIN_IPFS).pop()}`)
  }

  if (root.host.includes(SUBDOMAIN_IPNS)) {
    root = new URL(`${root.protocol}//${root.host.split(SUBDOMAIN_IPNS).pop()}`)
  }

  return asSubdomainMatch(url, root) ?? asPathMatch(url, root) ?? asNativeMatch(url, root) ?? asInternalOrExternalURI(url, root)
}
