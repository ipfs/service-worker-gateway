import { expect } from 'aegir/chai'
import { cidV1Bytes, parseCID } from '../../../src/cloudflare/snippets/cid.ts'
import { base16Encode, base32Decode, base32Encode, base36Decode, base36Encode, base58Encode, base64urlEncode } from '../../../src/cloudflare/snippets/codec.ts'

describe('parseCID', () => {
  it('parses CIDv0 (Qm...)', () => {
    const parsed = parseCID('QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR')

    if (parsed == null) {
      throw new Error('Failed to parse CID from string')
    }

    expect(parsed.version).to.equal(0)
    expect(parsed.codec).to.equal(0x70, 'codec should be dag-pb')
    expect(parsed.multihash.length).to.equal(34)
  })

  it('parses CIDv1 base32 (bafy...)', () => {
    const parsed = parseCID('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi')

    if (parsed == null) {
      throw new Error('Failed to parse CID from string')
    }

    expect(parsed.version).to.equal(1)
    expect(parsed.codec).to.equal(0x70, 'codec should be dag-pb')
  })

  it('parses CIDv1 base36 (k...)', () => {
    const parsed = parseCID('k51qzi5uqu5dlxjl6owpco0tn82bed1444cng351cnc48odwnr7e9pmx4nmmkh')

    if (parsed == null) {
      throw new Error('Failed to parse CID from string')
    }

    expect(parsed.version).to.equal(1)
    expect(parsed.codec).to.equal(0x72, 'codec should be libp2p-key')
  })

  it('parses CIDv1 base16 (f...)', () => {
    const knownBytes = base32Decode('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'.substring(1))
    const parsed = parseCID('f' + base16Encode(knownBytes))

    if (parsed == null) {
      throw new Error('Failed to parse CID from string')
    }

    expect(parsed.version).to.equal(1)
    expect(parsed.codec).to.equal(0x70)
  })

  it('parses CIDv1 base64url (u...)', () => {
    const knownBytes = base32Decode('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'.substring(1))
    const parsed = parseCID('u' + base64urlEncode(knownBytes))

    if (parsed == null) {
      throw new Error('Failed to parse CID from string')
    }

    expect(parsed.version).to.equal(1)
    expect(parsed.codec).to.equal(0x70)
  })

  it('parses CIDv1 z-prefixed base58btc (z...)', () => {
    const knownBytes = base32Decode('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'.substring(1))
    const parsed = parseCID('z' + base58Encode(knownBytes))

    if (parsed == null) {
      throw new Error('Failed to parse CID from string')
    }

    expect(parsed.version).to.equal(1)
    expect(parsed.codec).to.equal(0x70)
  })

  it('parses bare base58btc CIDv1 peer ID (12D3K... style)', () => {
    const ipnsBytes = base36Decode('k51qzi5uqu5dlxjl6owpco0tn82bed1444cng351cnc48odwnr7e9pmx4nmmkh'.substring(1))
    const bareB58 = base58Encode(ipnsBytes)
    const parsed = parseCID(bareB58)

    if (parsed == null) {
      throw new Error('Failed to parse CID from string')
    }

    expect(parsed.version).to.equal(1)
    expect(parsed.codec).to.equal(0x72, 'codec should be libp2p-key')
  })

  it('returns null for invalid input', () => {
    expect(parseCID('')).to.equal(null)
    expect(parseCID('x')).to.equal(null)
    expect(parseCID('not-a-cid')).to.equal(null)
  })

  it('returns null for short input', () => {
    expect(parseCID('Q')).to.equal(null)
  })
})

describe('CIDv0 to CIDv1 conversion', () => {
  it('converts CIDv0 to CIDv1 base32 for /ipfs/', () => {
    const parsed = parseCID('QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR')

    if (parsed == null) {
      throw new Error('Failed to parse CID from string')
    }

    const v1 = cidV1Bytes(0x70, parsed.multihash)
    expect('b' + base32Encode(v1), 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi')
  })

  it('converts CIDv0 to CIDv1 base36 for /ipns/ (libp2p-key codec)', () => {
    const parsed = parseCID('QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR')

    if (parsed == null) {
      throw new Error('Failed to parse CID from string')
    }

    const v1 = cidV1Bytes(0x72, parsed.multihash)
    const result = 'k' + base36Encode(v1)
    expect(result.startsWith('k')).to.be.true()
    expect(result.length > 40).to.be.true()
    // verify roundtrip
    const reparsed = parseCID(result)

    if (reparsed == null) {
      throw new Error('Failed to parse CID from string')
    }

    expect(reparsed.version).to.equal(1)
    expect(reparsed.codec).to.equal(0x72)
    expect(reparsed.multihash).to.equalBytes(parsed.multihash)
  })
})
