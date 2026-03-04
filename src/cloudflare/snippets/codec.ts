/**
 * varint (unsigned LEB128) encode/decode
 */
export function varintDecode (buf: Uint8Array, offset: number): [number, number] {
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

export function varintEncode (value: number): Uint8Array {
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

// helper: encode bytes as lowercase hex
export function base16Encode (bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * base16 (hex) decode
 */
export function base16Decode (str: string): Uint8Array {
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
