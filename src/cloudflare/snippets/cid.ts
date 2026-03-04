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
export function parseCID (str: string): CID | null {
  if (str.length < 2) { return null }

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
      if (ver !== 1) { return null }
    }

    // parse CIDv1 structure: version varint + codec varint + multihash
    let offset = 0
    const [version, vLen] = varintDecode(bytes, offset)
    offset += vLen
    if (version !== 1) { return null }

    const [codec, cLen] = varintDecode(bytes, offset)
    offset += cLen

    const multihash = bytes.slice(offset)
    return { version: 1, codec, multihash, raw: bytes }
  } catch {
    return null
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
