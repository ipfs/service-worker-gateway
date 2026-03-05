import { CODE_DAG_PB, CODE_LIBP2P_KEY } from '../../ui/pages/multicodec-table.ts'
import { base16Decode, base32Decode, base36Decode, base58Decode, base64urlDecode, varintDecode, varintEncode } from './codec.ts'

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
