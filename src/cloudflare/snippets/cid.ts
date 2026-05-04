import { CODE_DAG_PB, CODE_LIBP2P_KEY } from '../../ui/pages/multicodec-table.ts'
import {
  base2Decode,
  base16Decode, base16UpperDecode,
  base32Decode, base32UpperDecode, base32PadDecode, base32PadUpperDecode,
  base32HexDecode, base32HexUpperDecode, base32HexPadDecode, base32HexPadUpperDecode,
  base36Decode, base36UpperDecode,
  base58Decode, base58FlickrDecode,
  base64Decode, base64PadDecode, base64urlDecode, base64UrlPadDecode,
  base256EmojiDecode, B256EMOJI_PREFIX_CP,
  varintDecode, varintEncode
} from './codec.ts'

export interface CID {
  version: number
  codec: number
  multihash: Uint8Array
  raw: Uint8Array
}

/**
 * CID parsing
 */
export function parseCID (str: string): CID {
  if (str.length < 2) {
    throw new Error('Could not parse CID: input too short')
  }

  if (str.includes('.')) {
    throw new Error('Could not parse CID: probably a domain name')
  }

  let bytes

  // CIDv0: bare base58btc multihash starting with Qm
  if (str.length === 46 && str.startsWith('Qm')) {
    bytes = base58Decode(str)

    return {
      version: 0,
      codec: CODE_DAG_PB, // could also be RSA peer id
      multihash: bytes,
      raw: bytes
    }
  }

  // CIDv1 with multibase prefix
  const prefix = str[0]
  const rest = str.substring(1)
  let offset = 0

  // Multibase prefix dispatch. Mirrors `ipfs multibase list`
  // (https://github.com/multiformats/multibase/blob/master/multibase.csv).
  // 'b' (base32) and 'k' (base36) run first: they are the canonical
  // subdomain labels for /ipfs/ and /ipns/ and cover the hot path.
  // base256emoji runs next: its 🚀 prefix is U+1F680, two UTF-16 code
  // units, so the single-char checks below would not see it.
  if (prefix === 'b') {
    bytes = base32Decode(rest)
  } else if (prefix === 'k') {
    bytes = base36Decode(rest)
  } else if (str.codePointAt(0) === B256EMOJI_PREFIX_CP) {
    bytes = base256EmojiDecode(str.slice(2))
  } else if (prefix === '0') {
    bytes = base2Decode(rest)
  } else if (prefix === 'B') {
    bytes = base32UpperDecode(rest)
  } else if (prefix === 'c') {
    bytes = base32PadDecode(rest)
  } else if (prefix === 'C') {
    bytes = base32PadUpperDecode(rest)
  } else if (prefix === 'v') {
    bytes = base32HexDecode(rest)
  } else if (prefix === 'V') {
    bytes = base32HexUpperDecode(rest)
  } else if (prefix === 't') {
    bytes = base32HexPadDecode(rest)
  } else if (prefix === 'T') {
    bytes = base32HexPadUpperDecode(rest)
  } else if (prefix === 'K') {
    bytes = base36UpperDecode(rest)
  } else if (prefix === 'z') {
    bytes = base58Decode(rest)
  } else if (prefix === 'Z') {
    bytes = base58FlickrDecode(rest)
  } else if (prefix === 'f') {
    bytes = base16Decode(rest)
  } else if (prefix === 'F') {
    bytes = base16UpperDecode(rest)
  } else if (prefix === 'm') {
    bytes = base64Decode(rest)
  } else if (prefix === 'M') {
    bytes = base64PadDecode(rest)
  } else if (prefix === 'u') {
    bytes = base64urlDecode(rest)
  } else if (prefix === 'U') {
    bytes = base64UrlPadDecode(rest)
  } else {
    // try bare base58btc (handles 12D3K... peer IDs)
    bytes = base58Decode(str)
  }

  if (str.startsWith('12D3K')) {
    return {
      version: 0,
      codec: CODE_LIBP2P_KEY,
      multihash: bytes,
      raw: bytes
    }
  }

  // parse CIDv1 structure: version varint + codec varint + multihash
  const versionDecode = varintDecode(bytes, offset)
  const version = versionDecode[0]
  offset += versionDecode[1]

  if (version !== 1) {
    throw new Error(`Could not parse CID: unsupported version ${version}`)
  }

  const codecDecode = varintDecode(bytes, offset)
  const codec = codecDecode[0]
  offset += codecDecode[1]

  const multihash = bytes.slice(offset)

  const multihashCodecDecode = varintDecode(bytes, offset)
  offset += multihashCodecDecode[1]

  const multihashValueDecode = varintDecode(bytes, offset)
  offset += multihashValueDecode[1]
  const multihashValue = bytes.slice(offset)

  if (multihashValue.byteLength !== multihashValueDecode[0]) {
    throw new Error(`Could not parse CID: invalid multihash length - expected ${multihashValueDecode[0]} got ${multihashValue.byteLength}`)
  }

  return {
    version,
    codec,
    multihash,
    raw: bytes
  }
}

/**
 * build CIDv1 binary: version(1) + codec + multihash
 */
export function cidV1Bytes (codec: number, multihash: Uint8Array): Uint8Array {
  const ver = varintEncode(1)
  const cod = varintEncode(codec)
  const out = new Uint8Array(ver.length + cod.length + multihash.length)
  out.set(ver, 0)
  out.set(cod, ver.length)
  out.set(multihash, ver.length + cod.length)
  return out
}
