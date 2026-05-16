import { isIP } from '@chainsafe/is-ip'
import { InvalidParametersError } from '@libp2p/interface'
import { peerIdFromCID, peerIdFromString } from '@libp2p/peer-id'
import { base16, base16upper } from 'multiformats/bases/base16'
import { base2 } from 'multiformats/bases/base2'
import { base256emoji } from 'multiformats/bases/base256emoji'
import { base32, base32hex, base32hexpad, base32hexpadupper, base32hexupper, base32pad, base32padupper, base32upper } from 'multiformats/bases/base32'
import { base36, base36upper } from 'multiformats/bases/base36'
import { base58btc, base58flickr } from 'multiformats/bases/base58'
import { base64, base64pad, base64url, base64urlpad } from 'multiformats/bases/base64'
import { CID } from 'multiformats/cid'
import { dnsLinkLabelDecoder, dnsLinkLabelEncoder, isInlinedDnsLink } from './dns-link-labels.ts'
import type { PeerId } from '@libp2p/interface'
import type { MultibaseDecoder } from 'multiformats/cid'

// 🚀 (U+1F680) is the base256emoji prefix. JS strings store it as a surrogate
// pair, so a `str[0]` lookup never matches; check the codepoint instead.
const BASE256_EMOJI_PREFIX_CP = 0x1F680

// Browsers percent-encode 🚀 (and the rest of the emoji alphabet) when it
// appears in a URL path. We watch for this exact prefix so we can decode
// only the emoji case and leave every ASCII base alone.
const BASE256_EMOJI_PREFIX_PCT = '%F0%9F%9A%80'

export type URIType = 'subdomain' | 'path' | 'native' | 'internal' | 'external'

/**
 * A request for a CID
 */
export interface IPFSURI {
  protocol: 'ipfs'
  type: 'subdomain' | 'path' | 'native'
  cid: CID
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

function toIPFSURI (type: 'subdomain' | 'path' | 'native', cidStr: string, host: string, pathname: string, search: string, hash: string, root: URL): IPFSURI | undefined {
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

  const output: IPFSURI = {
    type,
    protocol: 'ipfs',
    cid,
    subdomainURL: new URL(`${root.protocol}//${cid.toV1().toString(base32)}.ipfs.${root.host}${pathname}${search}${hash}`),
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

    // base256emoji CIDs can arrive in two shapes:
    //   - raw 🚀… , when the caller already holds a decoded string
    //   - %F0%9F%9A%80… , when the URL parser percent-encoded the path
    // The raw form needs no work; findMultibaseDecoder picks it up via
    // codePointAt below. Decode only the percent form so ASCII bases
    // stay on the zero-decode hot path.
    if (str.startsWith(BASE256_EMOJI_PREFIX_PCT)) {
      str = decodeURIComponent(str)
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

// Map the multibase prefix character to its decoder. Covers every base in
// `ipfs multibase list` minus identity. base32 (`b`) and base36 (`k`) come
// first as the canonical subdomain labels for /ipfs/ and /ipns/.
function findMultibaseDecoder (str: string): MultibaseDecoder<string> | undefined {
  switch (str.substring(0, 1)) {
    case 'b': return base32
    case 'k': return base36
    case '0': return base2
    case 'B': return base32upper
    case 'c': return base32pad
    case 'C': return base32padupper
    case 'v': return base32hex
    case 'V': return base32hexupper
    case 't': return base32hexpad
    case 'T': return base32hexpadupper
    case 'K': return base36upper
    case 'z': return base58btc
    case 'Z': return base58flickr
    case 'f': return base16
    case 'F': return base16upper
    case 'm': return base64
    case 'M': return base64pad
    case 'u': return base64url
    case 'U': return base64urlpad
    default:
      // fall through to the codepoint check below
  }

  // 🚀 (base256emoji) is two UTF-16 code units, so str.substring(0, 1) above
  // returns just the high surrogate and never matches a case. Check the
  // codepoint here as a last step so the ASCII switch stays the hot path.
  if (str.codePointAt(0) === BASE256_EMOJI_PREFIX_CP) {
    return base256emoji
  }
}

function encodePathComponents (str: string): string {
  return str.split('/')
    .map(component => encodeURIComponent(component))
    .join('/')
}

export function parseRequest (url: URL | string, root: URL): ResolvableURI {
  if (url instanceof String || typeof url === 'string') {
    if (url.startsWith('/ipfs/')) {
      url = new URL(`ipfs://${encodePathComponents(url.substring('/ipfs/'.length))}`)
    } else if (url.startsWith('/ipns/')) {
      url = new URL(`ipns://${encodePathComponents(url.substring('/ipns/'.length))}`)
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
