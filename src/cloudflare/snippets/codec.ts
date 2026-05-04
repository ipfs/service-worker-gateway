/**
 * varint (unsigned LEB128) decode. Returns [value, bytesRead].
 *
 * Real CID inputs only carry tiny varints (version=1, multicodec under 2^16),
 * but a malformed CID could feed a large value here. The bitwise
 * `(byte & 0x7f) << shift` form is signed 32-bit and silently truncates
 * once shift > 24, so multiply instead and throw on values past
 * MAX_SAFE_INTEGER or runs longer than 9 bytes.
 */
export function varintDecode (buf: Uint8Array, offset: number): [number, number] {
  let value = 0
  let shift = 0
  let i = offset
  while (i < buf.length) {
    const byte = buf[i]
    value += (byte & 0x7f) * 2 ** shift
    if (value > Number.MAX_SAFE_INTEGER) {
      throw new Error('varint value is too large to decode safely')
    }
    i++
    if ((byte & 0x80) === 0) { return [value, i - offset] }
    shift += 7
    if (shift > 49) { throw new Error('varint has too many bytes (max is 9)') }
  }
  throw new Error('varint input ended early (more bytes expected)')
}

/**
 * varint (unsigned LEB128) encode.
 *
 * LEB128 is unsigned, so reject anything that is not a non-negative safe
 * integer; a negative or fractional input would otherwise produce garbage
 * bytes. Use `% 128` and `Math.floor(/ 128)` rather than `>>> 7`, which
 * truncates to 32 bits and would mis-encode values above 2^32.
 */
export function varintEncode (value: number): Uint8Array {
  if (!Number.isInteger(value) || value < 0 || value > Number.MAX_SAFE_INTEGER) {
    throw new Error(`varint value must be a whole number from 0 to ${Number.MAX_SAFE_INTEGER}, got ${value}`)
  }
  const bytes = []
  while (value > 0x7f) {
    bytes.push((value % 128) | 0x80)
    value = Math.floor(value / 128)
  }
  bytes.push(value & 0x7f)
  return new Uint8Array(bytes)
}

// Build a 128-entry ASCII lookup table for an alphabet. Slots that are not
// in the alphabet hold INVALID (0xff), which is out of range for every
// alphabet here (max index 63 for base64). Decoders must check for INVALID
// before using the value; otherwise unknown characters silently decode to
// whatever byte the alphabet's first character maps to.
const INVALID = 0xff
function makeMap (alphabet: string): Uint8Array {
  const m = new Uint8Array(128).fill(INVALID)
  for (let i = 0; i < alphabet.length; i++) {
    m[alphabet.charCodeAt(i)] = i
  }
  return m
}

// Look up an ASCII character in a decoder map; throw if it is not in the
// alphabet. Char codes >= 128 are rejected because the map is 128 wide.
function lookup (map: Uint8Array, str: string, i: number, base: string): number {
  const code = str.charCodeAt(i)
  const v = code < 128 ? map[code] : INVALID
  if (v === INVALID) {
    throw new Error(`not a valid ${base} character at position ${i}: ${JSON.stringify(str[i])}`)
  }
  return v
}

const B58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const B58_MAP = makeMap(B58_ALPHABET)

export function base58Encode (bytes: Uint8Array): string {
  let zeros = 0
  while (zeros < bytes.length && bytes[zeros] === 0) { zeros++ }
  const size = ((bytes.length - zeros) * 138 / 100 | 0) + 1
  const digits = new Uint8Array(size)
  for (let i = zeros; i < bytes.length; i++) {
    let carry = bytes[i]
    for (let j = size - 1; j >= 0; j--) {
      carry += 256 * digits[j]
      digits[j] = carry % 58
      carry = (carry / 58) | 0
    }
  }
  let start = 0
  while (start < size && digits[start] === 0) { start++ }
  let out = ''
  for (let i = 0; i < zeros; i++) { out += '1' }
  for (let i = start; i < size; i++) { out += B58_ALPHABET[digits[i]] }
  return out
}

export function base58Decode (str: string): Uint8Array {
  // count leading '1's (zero bytes)
  let zeros = 0
  while (zeros < str.length && str[zeros] === '1') { zeros++ }

  // allocate enough space: log(58)/log(256) ≈ 0.733
  const size = ((str.length - zeros) * 733 / 1000 | 0) + 1
  const buf = new Uint8Array(size)

  for (let i = zeros; i < str.length; i++) {
    let carry = lookup(B58_MAP, str, i, 'base58')
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
const B32_MAP = makeMap(B32_ALPHABET)

/**
 * base32lower encode (RFC 4648, no padding)
 */
export function base32Encode (bytes: Uint8Array): string {
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

/**
 * base32lower decode (RFC 4648, no padding)
 */
export function base32Decode (str: string): Uint8Array {
  str = str.toLowerCase()
  const out = []
  let bits = 0
  let buffer = 0
  for (let i = 0; i < str.length; i++) {
    const val = lookup(B32_MAP, str, i, 'base32')
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
const B36_MAP = makeMap(B36_ALPHABET)

/**
 * base36lower encode
 */
export function base36Encode (bytes: Uint8Array): string {
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
export function base36Decode (str: string): Uint8Array {
  str = str.toLowerCase()
  let zeros = 0
  while (zeros < str.length && str[zeros] === '0') { zeros++ }

  // log(36)/log(256) ≈ 0.646
  const size = ((str.length - zeros) * 646 / 1000 | 0) + 1
  const buf = new Uint8Array(size)

  for (let i = zeros; i < str.length; i++) {
    let carry = lookup(B36_MAP, str, i, 'base36')
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

// helper: encode bytes as lowercase hex
export function base16Encode (bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

const B16_ALPHABET = '0123456789abcdef'
const B16_MAP = makeMap(B16_ALPHABET)

/**
 * base16 (hex) decode
 */
export function base16Decode (str: string): Uint8Array {
  str = str.toLowerCase()
  if (str.length % 2 !== 0) { str = '0' + str }
  const out = new Uint8Array(str.length / 2)
  for (let i = 0; i < out.length; i++) {
    const hi = lookup(B16_MAP, str, i * 2, 'base16')
    const lo = lookup(B16_MAP, str, i * 2 + 1, 'base16')
    out[i] = (hi << 4) | lo
  }
  return out
}

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
const B64_MAP = makeMap(B64_ALPHABET)

// helper: base64url encode (only needed for tests)
export function base64urlEncode (bytes: Uint8Array): string {
  let out = ''
  let bits = 0
  let buffer = 0
  for (let i = 0; i < bytes.length; i++) {
    buffer = (buffer << 8) | bytes[i]
    bits += 8
    while (bits >= 6) {
      bits -= 6
      out += B64_ALPHABET[(buffer >>> bits) & 0x3f]
    }
  }
  if (bits > 0) { out += B64_ALPHABET[(buffer << (6 - bits)) & 0x3f] }
  return out
}

/**
 * base64url decode (no padding)
 */
export function base64urlDecode (str: string): Uint8Array {
  const out = []
  let bits = 0
  let buffer = 0
  for (let i = 0; i < str.length; i++) {
    const val = lookup(B64_MAP, str, i, 'base64url')
    buffer = (buffer << 6) | val
    bits += 6
    if (bits >= 8) {
      bits -= 8
      out.push((buffer >>> bits) & 0xff)
    }
  }
  return new Uint8Array(out)
}

// === kubo-aligned multibase extensions ===
// Decoders for the rest of `ipfs multibase list`. Most are thin wrappers
// over the decoders above: alphabets are case-insensitive, padding strips
// off, and base64 maps to base64url by swapping `+/` for `-_`.

const stripPad = (s: string): string => s.replace(/[=]+$/, '')

// base32 variants (RFC4648): upper, padded, padded-upper.
export const base32UpperDecode = (s: string): Uint8Array => base32Decode(s.toLowerCase())
export const base32PadDecode = (s: string): Uint8Array => base32Decode(stripPad(s))
export const base32PadUpperDecode = (s: string): Uint8Array => base32Decode(stripPad(s).toLowerCase())

// base32hex uses the RFC4648 extended hex alphabet, so it needs its own map.
const B32HEX_ALPHABET = '0123456789abcdefghijklmnopqrstuv'
const B32HEX_MAP = makeMap(B32HEX_ALPHABET)
export function base32HexDecode (str: string): Uint8Array {
  str = str.toLowerCase()
  const out = []
  let bits = 0
  let buffer = 0
  for (let i = 0; i < str.length; i++) {
    const val = lookup(B32HEX_MAP, str, i, 'base32hex')
    buffer = (buffer << 5) | val
    bits += 5
    if (bits >= 8) {
      bits -= 8
      out.push((buffer >>> bits) & 0xff)
    }
  }
  return new Uint8Array(out)
}
export const base32HexUpperDecode = (s: string): Uint8Array => base32HexDecode(s.toLowerCase())
export const base32HexPadDecode = (s: string): Uint8Array => base32HexDecode(stripPad(s))
export const base32HexPadUpperDecode = (s: string): Uint8Array => base32HexDecode(stripPad(s).toLowerCase())

// base16 and base36 upper: only the case differs from the lowercase form.
export const base16UpperDecode = (s: string): Uint8Array => base16Decode(s.toLowerCase())
export const base36UpperDecode = (s: string): Uint8Array => base36Decode(s.toLowerCase())

// base58flickr uses its own alphabet (lowercase first, then uppercase).
const B58FLICKR_ALPHABET = '123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ'
const B58FLICKR_MAP = makeMap(B58FLICKR_ALPHABET)
export function base58FlickrDecode (str: string): Uint8Array {
  let zeros = 0
  while (zeros < str.length && str[zeros] === '1') { zeros++ }
  const size = ((str.length - zeros) * 733 / 1000 | 0) + 1
  const buf = new Uint8Array(size)
  for (let i = zeros; i < str.length; i++) {
    let carry = lookup(B58FLICKR_MAP, str, i, 'base58flickr')
    for (let j = size - 1; j >= 0; j--) {
      carry += 58 * buf[j]
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

// base64 and base64pad differ from base64url only in `+/` vs `-_`. Swap
// them back so we can reuse base64urlDecode.
const toUrl = (s: string): string => s.replace(/\+/g, '-').replace(/\//g, '_')
export const base64Decode = (s: string): Uint8Array => base64urlDecode(toUrl(s))
export const base64PadDecode = (s: string): Uint8Array => base64Decode(stripPad(s))
export const base64UrlPadDecode = (s: string): Uint8Array => base64urlDecode(stripPad(s))

// base2: one bit per character ('0' or '1').
const ASCII_ZERO = '0'.charCodeAt(0)
const ASCII_ONE = '1'.charCodeAt(0)
export function base2Decode (str: string): Uint8Array {
  const out = []
  let bits = 0
  let buffer = 0
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i)
    let v: number
    if (c === ASCII_ZERO) {
      v = 0
    } else if (c === ASCII_ONE) {
      v = 1
    } else {
      throw new Error('invalid base2 char')
    }
    buffer = (buffer << 1) | v
    bits += 1
    if (bits >= 8) {
      bits -= 8
      out.push((buffer >>> bits) & 0xff)
    }
  }
  return new Uint8Array(out)
}

// base256emoji: one emoji codepoint per byte. Alphabet copied verbatim from
// https://github.com/multiformats/js-multiformats/blob/master/src/bases/base256emoji.ts
const B256EMOJI_ALPHABET = '🚀🪐☄🛰🌌🌑🌒🌓🌔🌕🌖🌗🌘🌍🌏🌎🐉☀💻🖥💾💿😂❤😍🤣😊🙏💕😭😘👍😅👏😁🔥🥰💔💖💙😢🤔😆🙄💪😉☺👌🤗💜😔😎😇🌹🤦🎉💞✌✨🤷😱😌🌸🙌😋💗💚😏💛🙂💓🤩😄😀🖤😃💯🙈👇🎶😒🤭❣😜💋👀😪😑💥🙋😞😩😡🤪👊🥳😥🤤👉💃😳✋😚😝😴🌟😬🙃🍀🌷😻😓⭐✅🥺🌈😈🤘💦✔😣🏃💐☹🎊💘😠☝😕🌺🎂🌻😐🖕💝🙊😹🗣💫💀👑🎵🤞😛🔴😤🌼😫⚽🤙☕🏆🤫👈😮🙆🍻🍃🐶💁😲🌿🧡🎁⚡🌞🎈❌✊👋😰🤨😶🤝🚶💰🍓💢🤟🙁🚨💨🤬✈🎀🍺🤓😙💟🌱😖👶🥴▶➡❓💎💸⬇😨🌚🦋😷🕺⚠🙅😟😵👎🤲🤠🤧📌🔵💅🧐🐾🍒😗🤑🌊🤯🐷☎💧😯💆👆🎤🙇🍑❄🌴💣🐸💌📍🥀🤢👅💡💩👐📸👻🤐🤮🎼🥵🚩🍎🍊👼💍📣🥂'
const B256EMOJI_MAP = new Map<number, number>()
{
  let i = 0
  for (const ch of B256EMOJI_ALPHABET) {
    B256EMOJI_MAP.set(ch.codePointAt(0)!, i)
    i++
  }
}
export const B256EMOJI_PREFIX_CP = 0x1F680 // 🚀 codepoint
export function base256EmojiDecode (str: string): Uint8Array {
  const out: number[] = []
  for (const ch of str) {
    const v = B256EMOJI_MAP.get(ch.codePointAt(0)!)
    if (v === undefined) { throw new Error('invalid base256emoji char') }
    out.push(v)
  }
  return new Uint8Array(out)
}
