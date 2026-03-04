import { isIP } from '@chainsafe/is-ip'
import { InvalidParametersError } from '@libp2p/interface'
import { base32Encode } from '../cloudflare/snippets/codec.ts'
import { dnsLinkLabelDecoder, dnsLinkLabelEncoder, isInlinedDnsLink } from './dns-link-labels.ts'
import type { CID } from '../cloudflare/snippets/cid.ts'

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
    cid = `b${base32Encode(parsed.raw)}`
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

function varintDecode (buf: Uint8Array, offset: number): [number, number] {
  let value = 0
  let shift = 0
  let i = offset
  while (i < buf.length) {
    const byte = buf[i]
    value |= (byte & 0x7f) << shift
    i++
    if ((byte & 0x80) === 0) { break }
    shift += 7
    if (shift > 49) { throw new Error('varint too long') }
  }
  return [value, i - offset]
}

function varintEncode (value: number): Uint8Array {
  const bytes = []
  while (value > 0x7f) {
    bytes.push((value & 0x7f) | 0x80)
    value >>>= 7
  }
  bytes.push(value & 0x7f)
  return new Uint8Array(bytes)
}

const B58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const B58_MAP = new Uint8Array(128)
for (let i = 0; i < B58_ALPHABET.length; i++) { B58_MAP[B58_ALPHABET.charCodeAt(i)] = i }

function base58Decode (str: string): Uint8Array {
  // count leading '1's (zero bytes)
  let zeros = 0
  while (zeros < str.length && str[zeros] === '1') { zeros++ }

  // allocate enough space: log(58)/log(256) ≈ 0.733
  const size = ((str.length - zeros) * 733 / 1000 | 0) + 1
  const buf = new Uint8Array(size)

  for (let i = zeros; i < str.length; i++) {
    let carry = B58_MAP[str.charCodeAt(i)]
    if (carry === undefined) { throw new Error('invalid base58 char') }
    for (let j = size - 1; j >= 0; j--) {
      carry += 58 * buf[j]
      buf[j] = carry & 0xff
      carry >>>= 8
    }
  }

  // skip leading zeros in buf
  let start = 0
  while (start < size && buf[start] === 0) { start++ }

  const result = new Uint8Array(zeros + size - start)
  // leading zero bytes from '1' chars are already 0
  result.set(buf.subarray(start), zeros)
  return result
}

const B32_ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567'
const B32_MAP = new Uint8Array(128)
for (let i = 0; i < B32_ALPHABET.length; i++) { B32_MAP[B32_ALPHABET.charCodeAt(i)] = i }

/**
 * base32lower decode (RFC 4648, no padding)
 */
function base32Decode (str: string): Uint8Array {
  str = str.toLowerCase()
  const out = []
  let bits = 0
  let buffer = 0
  for (let i = 0; i < str.length; i++) {
    const val = B32_MAP[str.charCodeAt(i)]
    if (val === undefined) { throw new Error('invalid base32 char') }
    buffer = (buffer << 5) | val
    bits += 5
    if (bits >= 8) {
      bits -= 8
      out.push((buffer >>> bits) & 0xff)
    }
  }
  return new Uint8Array(out)
}

// big-integer base conversion, same pattern as base58
const B36_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'
const B36_MAP = new Uint8Array(128)
for (let i = 0; i < B36_ALPHABET.length; i++) { B36_MAP[B36_ALPHABET.charCodeAt(i)] = i }

/**
 * base36lower encode
 */
function base36Encode (bytes: Uint8Array): string {
  // count leading zero bytes
  let zeros = 0
  while (zeros < bytes.length && bytes[zeros] === 0) { zeros++ }

  // estimate output size: log(256)/log(36) ≈ 1.548
  const size = ((bytes.length - zeros) * 1548 / 1000 | 0) + 1
  const digits = new Uint8Array(size)

  for (let i = zeros; i < bytes.length; i++) {
    let carry = bytes[i]
    for (let j = size - 1; j >= 0; j--) {
      carry += 256 * digits[j]
      digits[j] = carry % 36
      carry = (carry / 36) | 0
    }
  }

  let start = 0
  while (start < size && digits[start] === 0) { start++ }

  let out = ''
  for (let i = 0; i < zeros; i++) { out += '0' }
  for (let i = start; i < size; i++) { out += B36_ALPHABET[digits[i]] }
  return out
}

/**
 * base36lower decode
 */
function base36Decode (str: string): Uint8Array {
  str = str.toLowerCase()
  let zeros = 0
  while (zeros < str.length && str[zeros] === '0') { zeros++ }

  // log(36)/log(256) ≈ 0.646
  const size = ((str.length - zeros) * 646 / 1000 | 0) + 1
  const buf = new Uint8Array(size)

  for (let i = zeros; i < str.length; i++) {
    let carry = B36_MAP[str.charCodeAt(i)]
    if (carry === undefined) { throw new Error('invalid base36 char') }
    for (let j = size - 1; j >= 0; j--) {
      carry += 36 * buf[j]
      buf[j] = carry & 0xff
      carry >>>= 8
    }
  }

  let start = 0
  while (start < size && buf[start] === 0) { start++ }

  const result = new Uint8Array(zeros + size - start)
  result.set(buf.subarray(start), zeros)
  return result
}

/**
 * base16 (hex) decode
 */
function base16Decode (str: string): Uint8Array {
  str = str.toLowerCase()
  if (str.length % 2 !== 0) { str = '0' + str }
  const out = new Uint8Array(str.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(str.substring(i * 2, i * 2 + 2), 16)
  }
  return out
}

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
const B64_MAP = new Uint8Array(128)
for (let i = 0; i < B64_ALPHABET.length; i++) { B64_MAP[B64_ALPHABET.charCodeAt(i)] = i }

/**
 * base64url decode (no padding)
 */
function base64urlDecode (str: string): Uint8Array {
  const out = []
  let bits = 0
  let buffer = 0
  for (let i = 0; i < str.length; i++) {
    const val = B64_MAP[str.charCodeAt(i)]
    buffer = (buffer << 6) | val
    bits += 6
    if (bits >= 8) {
      bits -= 8
      out.push((buffer >>> bits) & 0xff)
    }
  }
  return new Uint8Array(out)
}

/**
 * build CIDv1 binary: version(1) + codec + multihash
 */
function cidV1Bytes (codec: number, multihash: Uint8Array): Uint8Array {
  const ver = varintEncode(1)
  const cod = varintEncode(codec)
  const out = new Uint8Array(ver.length + cod.length + multihash.length)
  out.set(ver, 0)
  out.set(cod, ver.length)
  out.set(multihash, ver.length + cod.length)
  return out
}

/**
 * Parses the string as a CID. Translates any thrown error to an
 * `InvalidParametersError` so we can show a 400 screen to the user.
 */
function parseCID (str: string): CID {
  try {
    let bytes

    // CIDv0: bare base58btc multihash starting with Qm
    if (str.length === 46 && str.startsWith('Qm')) {
      bytes = base58Decode(str)
      return { version: 0, codec: 0x70, multihash: bytes, raw: bytes }
    }

    // CIDv1 with multibase prefix
    const prefix = str[0]
    const rest = str.substring(1)

    if (prefix === 'b') {
      bytes = base32Decode(rest)
    } else if (prefix === 'k') {
      bytes = base36Decode(rest)
    } else if (prefix === 'z') {
      bytes = base58Decode(rest)
    } else if (prefix === 'f' || prefix === 'F') {
      bytes = base16Decode(rest)
    } else if (prefix === 'u') {
      bytes = base64urlDecode(rest)
    } else {
      // try bare base58btc (handles 12D3K... peer IDs)
      bytes = base58Decode(str)
      const [ver] = varintDecode(bytes, 0)
      if (ver !== 1) {
        throw new InvalidParametersError(`Unsupported version ${ver}`)
      }
    }

    // parse CIDv1 structure: version varint + codec varint + multihash
    let offset = 0
    const [version, vLen] = varintDecode(bytes, offset)
    offset += vLen
    if (version !== 1) {
      throw new InvalidParametersError(`Unsupported version ${version}`)
    }

    const [codec, cLen] = varintDecode(bytes, offset)
    offset += cLen

    const multihash = bytes.slice(offset)
    return { version: 1, codec, multihash, raw: bytes }
  } catch (err: any) {
    throw new InvalidParametersError(`Could not parse CID from string "${str}" - ${err.message}`)
  }
}

function parsePeerId (str: string): string {
  const parsed = parseCID(str)
  const v1 = parsed.version === 0 ? cidV1Bytes(0x72, parsed.multihash) : parsed.raw

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
