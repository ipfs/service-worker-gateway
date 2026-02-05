import { isIP } from '@chainsafe/is-ip'
import { InvalidParametersError } from '@libp2p/interface'
import { peerIdFromCID, peerIdFromString } from '@libp2p/peer-id'
import { base16, base16upper } from 'multiformats/bases/base16'
import { base32 } from 'multiformats/bases/base32'
import { base36 } from 'multiformats/bases/base36'
import { base58btc } from 'multiformats/bases/base58'
import { CID } from 'multiformats/cid'
import { dnsLinkLabelDecoder, dnsLinkLabelEncoder, isInlinedDnsLink } from './dns-link-labels.ts'
import { createSearch } from './query-helpers.ts'
import type { PeerId } from '@libp2p/interface'
import type { MultibaseDecoder } from 'multiformats/cid'

export type URIType = 'subdomain' | 'path' | 'native' | 'internal' | 'external'

/**
 * A request for a CID
 */
export interface IPFSURI {
  protocol: 'ipfs'
  type: 'subdomain' | 'path' | 'native'
  cid: CID
  gateways?: URL[]
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
  peerId: PeerId
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

function toIPFSURI (type: 'subdomain' | 'path' | 'native', cidStr: string, gateways: URL[], host: string, pathname: string, search: string, hash: string, root: URL): IPFSURI | undefined {
  if (cidStr == null || cidStr === '') {
    return
  }

  let cid: CID

  try {
    cid = parseCID(cidStr)
  } catch (err) {
    // e.g. throw if url was http://localhost/ipfs/invalid but not if it was
    // http://example.com/ipfs/invalid
    if (host === root.host) {
      throw err
    }

    return
  }

  const gatewayHints = new Set<string>(
    gateways.map(url => url.toString())
  )

  if (host != null && host !== '' && host !== root.host) {
    gatewayHints.add(`${root.protocol}//${host}/`)
  }

  // add gateways to search string
  search = createSearch(new URLSearchParams(search), {
    params: {
      gateway: [...gatewayHints]
    }
  })

  const output: IPFSURI = {
    type,
    protocol: 'ipfs',
    cid,
    subdomainURL: new URL(`${root.protocol}//${cid.toV1().toString(base32)}.ipfs.${root.host}${pathname}${search}${hash}`),
    pathURL: new URL(`${root.protocol}//${root.host}/ipfs/${cidStr}${pathname}${search}${hash}`),
    nativeURL: new URL(`ipfs://${cidStr}${pathname}${search}${hash}`),
    gateways: [...gatewayHints].map(gateway => new URL(gateway))
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
    peerId,
    subdomainURL: new URL(`${root.protocol}//${peerId.toCID().toString(base36)}.ipns.${root.host}${pathname}${search}${hash}`),
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
      url.searchParams.getAll('gateway')
        .map(str => {
          try {
            return new URL(str)
          } catch {}
          return undefined
        })
        .filter(val => val != null),
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
      url.searchParams.getAll('gateway')
        .map(str => {
          try {
            return new URL(str)
          } catch {}
          return undefined
        })
        .filter(val => val != null),
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
    } catch (err: any) {
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
      url.searchParams.getAll('gateway')
        .map(str => {
          try {
            return new URL(str)
          } catch {}
          return undefined
        })
        .filter(val => val != null),
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

/**
 * Parses the string as a CID. Translates any thrown error to an
 * `InvalidParametersError` so we can show a 400 screen to the user.
 */
function parseCID (str: string): CID<any, any, any, 1> {
  try {
    if (str.startsWith('Q')) {
      return CID.parse(str)
    }

    return CID.parse(str, findMultibaseDecoder(str))
  } catch (err: any) {
    throw new InvalidParametersError(`Could not parse CID from string "${str}" - ${err.message}`)
  }
}

function parsePeerId (str: string): PeerId {
  try {
    if (str.startsWith('Q') || str.startsWith('k') || str.startsWith('1')) {
      return peerIdFromString(str)
    }

    return peerIdFromString(str, findMultibaseDecoder(str))
  } catch {
    try {
      return peerIdFromCID(parseCID(str))
    } catch (err: any) {
      throw new InvalidParametersError(`Could not parse PeerId from string "${str}" - ${err.message}`)
    }
  }
}

function findMultibaseDecoder (str: string): MultibaseDecoder<string> | undefined {
  const prefix = str.substring(0, 1)

  switch (prefix) {
    case 'b':
      return base32
    case 'k':
      return base36
    case 'f':
      return base16
    case 'F':
      return base16upper
    case 'z':
      return base58btc
    default:
      // do nothing
  }
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
