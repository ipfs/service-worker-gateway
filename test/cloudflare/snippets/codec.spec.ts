import { expect } from 'aegir/chai'
import { base16Decode, base16Encode, base2Decode, base256EmojiDecode, base32Decode, base32Encode, base32HexDecode, base36Decode, base36Encode, base58Decode, base58Encode, base58FlickrDecode, base64Decode, base64urlDecode, base64urlEncode, varintDecode, varintEncode } from '../../../src/cloudflare/snippets/codec.ts'

describe('varint', () => {
  it('encodes and decodes single-byte values', () => {
    for (const v of [0, 1, 0x70, 0x72, 0x7f]) {
      const encoded = varintEncode(v)
      const [decoded, len] = varintDecode(encoded, 0)
      expect(decoded).to.equal(v)
      expect(len).to.equal(1)
    }
  })

  it('encodes and decodes multi-byte values', () => {
    for (const v of [128, 300, 0x0200, 0x1234]) {
      const encoded = varintEncode(v)
      const [decoded, len] = varintDecode(encoded, 0)
      expect(decoded).to.equal(v)
      expect(len).to.equal(encoded.length)
    }
  })
})

describe('base58btc', () => {
  it('decodes a CIDv0 (QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR)', () => {
    const bytes = base58Decode('QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR')
    // SHA2-256 multihash: 0x12 0x20 + 32 bytes = 34 bytes total
    expect(bytes.length).to.equal(34)
    expect(bytes[0]).to.equal(0x12, 'hash function code should be SHA2-256')
    expect(bytes[1]).to.equal(0x20, 'digest length should be 32')
  })

  it('roundtrips through encode/decode', () => {
    const original = 'QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR'
    const bytes = base58Decode(original)
    expect(base58Encode(bytes)).to.equal(original)
  })
})

describe('base32', () => {
  it('encodes and decodes known CIDv1 bytes', () => {
    const input = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
    const bytes = base32Decode(input.substring(1))
    const roundtrip = 'b' + base32Encode(bytes)
    expect(roundtrip).to.equal(input)
  })

  it('encodes and decodes minimal CID (bafyaaaa)', () => {
    const input = 'bafyaaaa'
    const bytes = base32Decode(input.substring(1))
    expect('b' + base32Encode(bytes)).to.equal(input)
  })
})

describe('base36', () => {
  it('encodes and decodes an IPNS key', () => {
    const input = 'k51qzi5uqu5dlxjl6owpco0tn82bed1444cng351cnc48odwnr7e9pmx4nmmkh'
    const bytes = base36Decode(input.substring(1))
    expect('k' + base36Encode(bytes)).to.equal(input)
  })
})

describe('base16', () => {
  it('decodes hex-encoded CIDv1', () => {
    const knownBytes = base32Decode('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'.substring(1))
    const hex = base16Encode(knownBytes)
    const decoded = base16Decode(hex)
    expect(decoded).to.equalBytes(knownBytes)
  })
})

describe('base64url', () => {
  it('decodes base64url-encoded CIDv1', () => {
    const knownBytes = base32Decode('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'.substring(1))
    const b64 = base64urlEncode(knownBytes)
    const decoded = base64urlDecode(b64)
    expect(decoded).to.equalBytes(knownBytes)
  })
})

// Decoders must throw on invalid characters, not silently decode them as
// byte 0. The earlier implementation backed lookup tables with Uint8Array
// (default 0) and checked `=== undefined`, which never matched, so any
// unknown char decoded as the alphabet's first character.
describe('invalid input throws', () => {
  const cases: Array<[string, (s: string) => Uint8Array, string, RegExp]> = [
    ['base58', base58Decode, 'abc!def', /not a valid base58 character/],
    ['base58flickr', base58FlickrDecode, 'abc!def', /not a valid base58flickr character/],
    ['base32', base32Decode, 'abc!def', /not a valid base32 character/],
    ['base32hex', base32HexDecode, 'abc!def', /not a valid base32hex character/],
    ['base36', base36Decode, 'abc!def', /not a valid base36 character/],
    ['base16', base16Decode, 'gg', /not a valid base16 character/],
    ['base64', base64Decode, 'abc!def', /not a valid base64url character/],
    ['base64url', base64urlDecode, 'abc!def', /not a valid base64url character/],
    ['base2', base2Decode, '0102', /invalid base2 char/],
    ['base256emoji', base256EmojiDecode, 'A', /invalid base256emoji char/]
  ]

  for (const [name, fn, input, pattern] of cases) {
    it(`${name} rejects out-of-alphabet chars`, () => {
      expect(() => fn(input)).to.throw(pattern)
    })
  }

  it('error message reports the offending position and character', () => {
    expect(() => base58Decode('abc!def')).to.throw(/position 3: "!"/)
    expect(() => base16Decode('aab!')).to.throw(/position 3: "!"/)
  })

  it('base58 rejects look-alikes that are not in the alphabet (0, O, I, l)', () => {
    expect(() => base58Decode('0abc')).to.throw(/not a valid base58 character/)
    expect(() => base58Decode('Oabc')).to.throw(/not a valid base58 character/)
    expect(() => base58Decode('Iabc')).to.throw(/not a valid base58 character/)
    expect(() => base58Decode('labc')).to.throw(/not a valid base58 character/)
  })

  it('rejects non-ASCII characters (char code >= 128)', () => {
    const nonAscii = String.fromCharCode(233) // 'é'
    expect(() => base58Decode('abc' + nonAscii + 'def')).to.throw(/not a valid base58 character/)
    expect(() => base32Decode('abc' + nonAscii + 'def')).to.throw(/not a valid base32 character/)
    expect(() => base16Decode('a' + nonAscii)).to.throw(/not a valid base16 character/)
  })
})

describe('varintDecode regressions', () => {
  it('decodes a single-byte varint (codec 0x70 dag-pb)', () => {
    expect(varintDecode(new Uint8Array([0x70]), 0)).to.deep.equal([0x70, 1])
  })

  it('decodes a two-byte varint (300 -> [0xac, 0x02])', () => {
    expect(varintDecode(new Uint8Array([0xac, 0x02]), 0)).to.deep.equal([300, 2])
  })

  it('decodes correctly across the 32-bit boundary', () => {
    // 2^28 needs 5 bytes. The old `<<` form was signed 32-bit and would
    // truncate (or go negative) once shift > 24.
    expect(varintDecode(new Uint8Array([0x80, 0x80, 0x80, 0x80, 0x01]), 0))
      .to.deep.equal([2 ** 28, 5])
    // 2^49: largest power of two inside MAX_SAFE_INTEGER, eight 7-bit bytes.
    expect(varintDecode(new Uint8Array([0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x01]), 0))
      .to.deep.equal([2 ** 49, 8])
  })

  it('respects the offset argument', () => {
    const buf = new Uint8Array([0xff, 0xff, 0xac, 0x02, 0xff])
    expect(varintDecode(buf, 2)).to.deep.equal([300, 2])
  })

  it('throws on a varint that exceeds Number.MAX_SAFE_INTEGER', () => {
    const buf = new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x7f])
    expect(() => varintDecode(buf, 0)).to.throw(/too large to decode safely/)
  })

  it('throws on more than 8 continuation bytes', () => {
    const buf = new Uint8Array([0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x01])
    expect(() => varintDecode(buf, 0)).to.throw(/too many bytes/)
  })

  it('throws on a truncated varint (continuation bit on last byte)', () => {
    expect(() => varintDecode(new Uint8Array([0x80]), 0)).to.throw(/ended early/)
  })
})

describe('varintEncode regressions', () => {
  it('encodes single-byte values', () => {
    expect(Array.from(varintEncode(0))).to.deep.equal([0])
    expect(Array.from(varintEncode(0x70))).to.deep.equal([0x70])
    expect(Array.from(varintEncode(0x7f))).to.deep.equal([0x7f])
  })

  it('encodes multi-byte values', () => {
    expect(Array.from(varintEncode(300))).to.deep.equal([0xac, 0x02])
    expect(Array.from(varintEncode(2 ** 28))).to.deep.equal([0x80, 0x80, 0x80, 0x80, 0x01])
  })

  it('encodes values above 2^32 correctly', () => {
    // The old `value >>>= 7` truncated to 32 bits, so any value above
    // 2^32 came out as garbage. Round-trip through decode to confirm.
    const big = 2 ** 40
    expect(varintDecode(varintEncode(big), 0)).to.deep.equal([big, 6])
  })

  const rejectCases: Array<[string, number]> = [
    ['negative', -1],
    ['fractional', 1.5],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['above MAX_SAFE_INTEGER', Number.MAX_SAFE_INTEGER + 2]
  ]

  for (const [label, value] of rejectCases) {
    it(`rejects ${label} input`, () => {
      expect(() => varintEncode(value)).to.throw(/must be a whole number/)
    })
  }
})
