import { expect } from 'aegir/chai'
import { base16Decode, base16Encode, base32Decode, base32Encode, base36Decode, base36Encode, base58Decode, base58Encode, base64urlDecode, base64urlEncode, varintDecode, varintEncode } from '../../../src/cloudflare/snippets/codec.ts'

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
