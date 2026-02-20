// Cloudflare Snippet: IPFS/IPNS path gateway to subdomain gateway redirect
//
// Redirects path gateway URLs to subdomain gateway URLs with CID normalization
// per https://specs.ipfs.tech/http-gateways/subdomain-gateway/
//
// /ipfs/{cid}[/path][?query] -> {base32-cidv1}.ipfs.{host}[/path][?query]
// /ipns/{peerid}[/path][?query] -> {base36-cidv1}.ipns.{host}[/path][?query]
// /ipns/{domain}[/path][?query] -> {dnslink-encoded}.ipns.{host}[/path][?query]

// -- varint (unsigned LEB128) encode/decode --

function varintDecode (buf, offset) {
  let value = 0
  let shift = 0
  let i = offset
  while (i < buf.length) {
    const byte = buf[i]
    value |= (byte & 0x7f) << shift
    i++
    if ((byte & 0x80) === 0) break
    shift += 7
    if (shift > 49) throw new Error('varint too long')
  }
  return [value, i - offset]
}

function varintEncode (value) {
  const bytes = []
  while (value > 0x7f) {
    bytes.push((value & 0x7f) | 0x80)
    value >>>= 7
  }
  bytes.push(value & 0x7f)
  return new Uint8Array(bytes)
}

// -- base58btc decode --

const B58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const B58_MAP = new Uint8Array(128)
for (let i = 0; i < B58_ALPHABET.length; i++) B58_MAP[B58_ALPHABET.charCodeAt(i)] = i

function base58Decode (str) {
  // count leading '1's (zero bytes)
  let zeros = 0
  while (zeros < str.length && str[zeros] === '1') zeros++

  // allocate enough space: log(58)/log(256) ≈ 0.733
  const size = ((str.length - zeros) * 733 / 1000 | 0) + 1
  const buf = new Uint8Array(size)

  for (let i = zeros; i < str.length; i++) {
    let carry = B58_MAP[str.charCodeAt(i)]
    if (carry === undefined) throw new Error('invalid base58 char')
    for (let j = size - 1; j >= 0; j--) {
      carry += 58 * buf[j]
      buf[j] = carry & 0xff
      carry >>>= 8
    }
  }

  // skip leading zeros in buf
  let start = 0
  while (start < size && buf[start] === 0) start++

  const result = new Uint8Array(zeros + size - start)
  // leading zero bytes from '1' chars are already 0
  result.set(buf.subarray(start), zeros)
  return result
}

// -- base32lower encode + decode (RFC 4648, no padding) --

const B32_ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567'
const B32_MAP = new Uint8Array(128)
for (let i = 0; i < B32_ALPHABET.length; i++) B32_MAP[B32_ALPHABET.charCodeAt(i)] = i

function base32Encode (bytes) {
  let out = ''
  let bits = 0
  let buffer = 0
  for (let i = 0; i < bytes.length; i++) {
    buffer = (buffer << 8) | bytes[i]
    bits += 8
    while (bits >= 5) {
      bits -= 5
      out += B32_ALPHABET[(buffer >>> bits) & 0x1f]
    }
  }
  if (bits > 0) {
    out += B32_ALPHABET[(buffer << (5 - bits)) & 0x1f]
  }
  return out
}

function base32Decode (str) {
  str = str.toLowerCase()
  const out = []
  let bits = 0
  let buffer = 0
  for (let i = 0; i < str.length; i++) {
    const val = B32_MAP[str.charCodeAt(i)]
    if (val === undefined) throw new Error('invalid base32 char')
    buffer = (buffer << 5) | val
    bits += 5
    if (bits >= 8) {
      bits -= 8
      out.push((buffer >>> bits) & 0xff)
    }
  }
  return new Uint8Array(out)
}

// -- base36lower encode + decode --
// big-integer base conversion, same pattern as base58

const B36_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'
const B36_MAP = new Uint8Array(128)
for (let i = 0; i < B36_ALPHABET.length; i++) B36_MAP[B36_ALPHABET.charCodeAt(i)] = i

function base36Encode (bytes) {
  // count leading zero bytes
  let zeros = 0
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++

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
  while (start < size && digits[start] === 0) start++

  let out = ''
  for (let i = 0; i < zeros; i++) out += '0'
  for (let i = start; i < size; i++) out += B36_ALPHABET[digits[i]]
  return out
}

function base36Decode (str) {
  str = str.toLowerCase()
  let zeros = 0
  while (zeros < str.length && str[zeros] === '0') zeros++

  // log(36)/log(256) ≈ 0.646
  const size = ((str.length - zeros) * 646 / 1000 | 0) + 1
  const buf = new Uint8Array(size)

  for (let i = zeros; i < str.length; i++) {
    let carry = B36_MAP[str.charCodeAt(i)]
    if (carry === undefined) throw new Error('invalid base36 char')
    for (let j = size - 1; j >= 0; j--) {
      carry += 36 * buf[j]
      buf[j] = carry & 0xff
      carry >>>= 8
    }
  }

  let start = 0
  while (start < size && buf[start] === 0) start++

  const result = new Uint8Array(zeros + size - start)
  result.set(buf.subarray(start), zeros)
  return result
}

// -- base16 (hex) decode --

function base16Decode (str) {
  str = str.toLowerCase()
  if (str.length % 2 !== 0) str = '0' + str
  const out = new Uint8Array(str.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(str.substring(i * 2, i * 2 + 2), 16)
  }
  return out
}

// -- base64url decode (no padding) --

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
const B64_MAP = new Uint8Array(128)
for (let i = 0; i < B64_ALPHABET.length; i++) B64_MAP[B64_ALPHABET.charCodeAt(i)] = i

function base64urlDecode (str) {
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

// -- CID parsing --

// returns { version, codec, multihash, raw } or null
function parseCID (str) {
  if (str.length < 2) return null

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
      if (ver !== 1) return null
    }

    // parse CIDv1 structure: version varint + codec varint + multihash
    let offset = 0
    const [version, vLen] = varintDecode(bytes, offset)
    offset += vLen
    if (version !== 1) return null

    const [codec, cLen] = varintDecode(bytes, offset)
    offset += cLen

    const multihash = bytes.slice(offset)
    return { version: 1, codec, multihash, raw: bytes }
  } catch {
    return null
  }
}

// build CIDv1 binary: version(1) + codec + multihash
function cidV1Bytes (codec, multihash) {
  const ver = varintEncode(1)
  const cod = varintEncode(codec)
  const out = new Uint8Array(ver.length + cod.length + multihash.length)
  out.set(ver, 0)
  out.set(cod, ver.length)
  out.set(multihash, ver.length + cod.length)
  return out
}

// -- DNSLink label encoding --
// https://specs.ipfs.tech/http-gateways/subdomain-gateway/#host-request-header

function dnsLinkEncode (domain) {
  return domain.replace(/-/g, '--').replace(/\./g, '-')
}

// -- main fetch handler --

export default {
  async fetch (request) {
    const url = new URL(request.url)
    const path = url.pathname

    if (!path.startsWith('/ipfs/') && !path.startsWith('/ipns/')) {
      return fetch(request)
    }

    const segments = path.split('/')
    // segments: ['', 'ipfs'|'ipns', identifier, ...rest]
    const namespace = segments[1]
    const identifier = segments[2]
    if (!identifier) return fetch(request)

    const remainingPath = '/' + segments.slice(3).join('/')

    let subdomain

    if (namespace === 'ipfs') {
      const parsed = parseCID(identifier)
      if (!parsed) return fetch(request)

      const v1 = parsed.version === 0 ? cidV1Bytes(0x70, parsed.multihash) : parsed.raw
      subdomain = 'b' + base32Encode(v1)
    } else if (namespace === 'ipns') {
      if (identifier.includes('.')) {
        // DNSLink domain name
        subdomain = dnsLinkEncode(identifier)
      } else {
        const parsed = parseCID(identifier)
        if (!parsed) return fetch(request)

        const v1 = parsed.version === 0 ? cidV1Bytes(0x72, parsed.multihash) : parsed.raw
        subdomain = 'k' + base36Encode(v1)
      }
    }

    if (!subdomain) return fetch(request)

    const redirectUrl = `${url.protocol}//${subdomain}.${namespace}.${url.host}${remainingPath}${url.search}`

    return new Response(null, {
      status: 301,
      headers: {
        Location: redirectUrl,
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    })
  }
}
