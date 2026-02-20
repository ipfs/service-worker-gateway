// Tests for 01_path_gateway_to_subdomain.js Cloudflare Snippet
//
// Run: node cloudflare/snippets/01_path_gateway_to_subdomain.test.js
//
// These tests verify the multibase encode/decode, CID parsing, DNSLink
// encoding, and the actual fetch handler without any npm dependencies.

import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

// Provide a global fetch stub so the snippet's passthrough calls don't throw.
// The handler calls fetch(request) when it decides not to redirect.
const PASSTHROUGH = Symbol('passthrough')
globalThis.fetch = () => Promise.resolve(Object.assign(new Response(null, { status: 200 }), { [PASSTHROUGH]: true }))

// Load snippet and expose internals for testing.
// The snippet uses `export default { ... }` which we replace with a local var
// so we can eval it and access internal functions.
const snippetPath = new URL('./01_path_gateway_to_subdomain.js', import.meta.url).pathname
const code = readFileSync(snippetPath, 'utf8')
const wrapped = code.replace('export default', 'const _handler =')
// eslint-disable-next-line no-new-func
const factory = new Function(wrapped + `
return {
  varintDecode, varintEncode,
  base58Decode, base32Encode, base32Decode, base36Encode, base36Decode,
  base16Decode, base64urlDecode,
  parseCID, cidV1Bytes, dnsLinkEncode, _handler
}
`)
const {
  varintDecode, varintEncode,
  base58Decode, base32Encode, base32Decode, base36Encode, base36Decode,
  base16Decode, base64urlDecode,
  parseCID, cidV1Bytes, dnsLinkEncode, _handler
} = factory()

// Call the real snippet handler and return the Location header or null on passthrough.
async function fetchRedirect (inputUrl) {
  const resp = await _handler.fetch({ url: inputUrl })
  if (resp[PASSTHROUGH]) return null
  return resp.headers.get('Location')
}

// helper: encode bytes as lowercase hex
function toHex (bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

// helper: base58btc encode (only needed for tests, not in the snippet itself)
const B58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
function base58Encode (bytes) {
  let zeros = 0
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++
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
  while (start < size && digits[start] === 0) start++
  let out = ''
  for (let i = 0; i < zeros; i++) out += '1'
  for (let i = start; i < size; i++) out += B58_ALPHABET[digits[i]]
  return out
}

// helper: base64url encode (only needed for tests)
const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
function base64urlEncode (bytes) {
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
  if (bits > 0) out += B64_ALPHABET[(buffer << (6 - bits)) & 0x3f]
  return out
}

// ---- tests ----

describe('varint', () => {
  it('encodes and decodes single-byte values', () => {
    for (const v of [0, 1, 0x70, 0x72, 0x7f]) {
      const encoded = varintEncode(v)
      const [decoded, len] = varintDecode(encoded, 0)
      assert.equal(decoded, v)
      assert.equal(len, 1)
    }
  })

  it('encodes and decodes multi-byte values', () => {
    for (const v of [128, 300, 0x0200, 0x1234]) {
      const encoded = varintEncode(v)
      const [decoded, len] = varintDecode(encoded, 0)
      assert.equal(decoded, v)
      assert.equal(len, encoded.length)
    }
  })
})

describe('base58btc', () => {
  it('decodes a CIDv0 (QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR)', () => {
    const bytes = base58Decode('QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR')
    // SHA2-256 multihash: 0x12 0x20 + 32 bytes = 34 bytes total
    assert.equal(bytes.length, 34)
    assert.equal(bytes[0], 0x12, 'hash function code should be SHA2-256')
    assert.equal(bytes[1], 0x20, 'digest length should be 32')
  })

  it('roundtrips through encode/decode', () => {
    const original = 'QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR'
    const bytes = base58Decode(original)
    assert.equal(base58Encode(bytes), original)
  })
})

describe('base32', () => {
  it('encodes and decodes known CIDv1 bytes', () => {
    const input = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
    const bytes = base32Decode(input.substring(1))
    const roundtrip = 'b' + base32Encode(bytes)
    assert.equal(roundtrip, input)
  })

  it('encodes and decodes minimal CID (bafyaaaa)', () => {
    const input = 'bafyaaaa'
    const bytes = base32Decode(input.substring(1))
    assert.equal('b' + base32Encode(bytes), input)
  })
})

describe('base36', () => {
  it('encodes and decodes an IPNS key', () => {
    const input = 'k51qzi5uqu5dlxjl6owpco0tn82bed1444cng351cnc48odwnr7e9pmx4nmmkh'
    const bytes = base36Decode(input.substring(1))
    assert.equal('k' + base36Encode(bytes), input)
  })
})

describe('base16', () => {
  it('decodes hex-encoded CIDv1', () => {
    const knownBytes = base32Decode('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'.substring(1))
    const hex = toHex(knownBytes)
    const decoded = base16Decode(hex)
    assert.deepEqual(decoded, knownBytes)
  })
})

describe('base64url', () => {
  it('decodes base64url-encoded CIDv1', () => {
    const knownBytes = base32Decode('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'.substring(1))
    const b64 = base64urlEncode(knownBytes)
    const decoded = base64urlDecode(b64)
    assert.deepEqual(decoded, knownBytes)
  })
})

describe('parseCID', () => {
  it('parses CIDv0 (Qm...)', () => {
    const parsed = parseCID('QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR')
    assert.notEqual(parsed, null)
    assert.equal(parsed.version, 0)
    assert.equal(parsed.codec, 0x70, 'codec should be dag-pb')
    assert.equal(parsed.multihash.length, 34)
  })

  it('parses CIDv1 base32 (bafy...)', () => {
    const parsed = parseCID('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi')
    assert.notEqual(parsed, null)
    assert.equal(parsed.version, 1)
    assert.equal(parsed.codec, 0x70, 'codec should be dag-pb')
  })

  it('parses CIDv1 base36 (k...)', () => {
    const parsed = parseCID('k51qzi5uqu5dlxjl6owpco0tn82bed1444cng351cnc48odwnr7e9pmx4nmmkh')
    assert.notEqual(parsed, null)
    assert.equal(parsed.version, 1)
    assert.equal(parsed.codec, 0x72, 'codec should be libp2p-key')
  })

  it('parses CIDv1 base16 (f...)', () => {
    const knownBytes = base32Decode('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'.substring(1))
    const parsed = parseCID('f' + toHex(knownBytes))
    assert.notEqual(parsed, null)
    assert.equal(parsed.version, 1)
    assert.equal(parsed.codec, 0x70)
  })

  it('parses CIDv1 base64url (u...)', () => {
    const knownBytes = base32Decode('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'.substring(1))
    const parsed = parseCID('u' + base64urlEncode(knownBytes))
    assert.notEqual(parsed, null)
    assert.equal(parsed.version, 1)
    assert.equal(parsed.codec, 0x70)
  })

  it('parses CIDv1 z-prefixed base58btc (z...)', () => {
    const knownBytes = base32Decode('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'.substring(1))
    const parsed = parseCID('z' + base58Encode(knownBytes))
    assert.notEqual(parsed, null)
    assert.equal(parsed.version, 1)
    assert.equal(parsed.codec, 0x70)
  })

  it('parses bare base58btc CIDv1 peer ID (12D3K... style)', () => {
    const ipnsBytes = base36Decode('k51qzi5uqu5dlxjl6owpco0tn82bed1444cng351cnc48odwnr7e9pmx4nmmkh'.substring(1))
    const bareB58 = base58Encode(ipnsBytes)

    const parsed = parseCID(bareB58)
    assert.notEqual(parsed, null)
    assert.equal(parsed.version, 1)
    assert.equal(parsed.codec, 0x72, 'codec should be libp2p-key')
  })

  it('returns null for invalid input', () => {
    assert.equal(parseCID(''), null)
    assert.equal(parseCID('x'), null)
    assert.equal(parseCID('not-a-cid'), null)
  })

  it('returns null for short input', () => {
    assert.equal(parseCID('Q'), null)
  })
})

describe('CIDv0 to CIDv1 conversion', () => {
  it('converts CIDv0 to CIDv1 base32 for /ipfs/', () => {
    const parsed = parseCID('QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR')
    const v1 = cidV1Bytes(0x70, parsed.multihash)
    assert.equal('b' + base32Encode(v1), 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi')
  })

  it('converts CIDv0 to CIDv1 base36 for /ipns/ (libp2p-key codec)', () => {
    const parsed = parseCID('QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR')
    const v1 = cidV1Bytes(0x72, parsed.multihash)
    const result = 'k' + base36Encode(v1)
    assert.ok(result.startsWith('k'))
    assert.ok(result.length > 40)
    // verify roundtrip
    const reparsed = parseCID(result)
    assert.equal(reparsed.version, 1)
    assert.equal(reparsed.codec, 0x72)
    assert.deepEqual(reparsed.multihash, parsed.multihash)
  })
})

describe('DNSLink label encoding', () => {
  it('encodes en.wikipedia-on-ipfs.org', () => {
    assert.equal(dnsLinkEncode('en.wikipedia-on-ipfs.org'), 'en-wikipedia--on--ipfs-org')
  })

  it('encodes specs.ipfs.tech', () => {
    assert.equal(dnsLinkEncode('specs.ipfs.tech'), 'specs-ipfs-tech')
  })

  it('encodes domain without dots or dashes', () => {
    assert.equal(dnsLinkEncode('localhost'), 'localhost')
  })

  it('encodes domain with only dots', () => {
    assert.equal(dnsLinkEncode('example.com'), 'example-com')
  })

  it('encodes domain with only dashes', () => {
    assert.equal(dnsLinkEncode('my-site'), 'my--site')
  })
})

describe('fetch handler', () => {
  it('/ipfs/ with CIDv0 redirects to base32 CIDv1 subdomain', async () => {
    const resp = await _handler.fetch({ url: 'https://dweb.link/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR/path?q=1' })
    assert.equal(resp.status, 301)
    assert.equal(resp.headers.get('Location'), 'https://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi.ipfs.dweb.link/path?q=1')
    assert.equal(resp.headers.get('Cache-Control'), 'public, max-age=31536000, immutable')
  })

  it('/ipfs/ with base32 CIDv1 redirects to subdomain', async () => {
    assert.equal(
      await fetchRedirect('https://dweb.link/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'),
      'https://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi.ipfs.dweb.link/'
    )
  })

  it('/ipns/ with base36 key redirects to subdomain', async () => {
    const key = 'k51qzi5uqu5dlxjl6owpco0tn82bed1444cng351cnc48odwnr7e9pmx4nmmkh'
    const resp = await _handler.fetch({ url: `https://dweb.link/ipns/${key}/file` })
    assert.equal(resp.status, 301)
    assert.equal(resp.headers.get('Location'), `https://${key}.ipns.dweb.link/file`)
    assert.equal(resp.headers.get('Cache-Control'), 'public, max-age=31536000, immutable')
  })

  it('/ipns/ with DNSLink domain redirects to encoded subdomain', async () => {
    assert.equal(
      await fetchRedirect('https://dweb.link/ipns/en.wikipedia-on-ipfs.org/wiki'),
      'https://en-wikipedia--on--ipfs-org.ipns.dweb.link/wiki'
    )
  })

  it('preserves query parameters', async () => {
    assert.equal(
      await fetchRedirect('https://dweb.link/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi?format=car&dag-scope=all'),
      'https://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi.ipfs.dweb.link/?format=car&dag-scope=all'
    )
  })

  it('preserves port numbers', async () => {
    assert.equal(
      await fetchRedirect('http://localhost:8080/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/file'),
      'http://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi.ipfs.localhost:8080/file'
    )
  })

  it('passes through for invalid CID', async () => {
    assert.equal(await fetchRedirect('https://dweb.link/ipfs/not-a-cid'), null)
  })

  it('passes through for missing identifier', async () => {
    assert.equal(await fetchRedirect('https://dweb.link/ipfs/'), null)
  })

  it('passes through for non-IPFS paths', async () => {
    assert.equal(await fetchRedirect('https://dweb.link/other/path'), null)
  })

  it('/ipfs/ with base16 CIDv1 redirects to base32 subdomain', async () => {
    const knownBytes = base32Decode('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'.substring(1))
    const hexCid = 'f' + toHex(knownBytes)
    assert.equal(
      await fetchRedirect(`https://dweb.link/ipfs/${hexCid}`),
      'https://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi.ipfs.dweb.link/'
    )
  })

  it('/ipfs/ with base64url CIDv1 redirects to base32 subdomain', async () => {
    const knownBytes = base32Decode('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'.substring(1))
    const b64Cid = 'u' + base64urlEncode(knownBytes)
    assert.equal(
      await fetchRedirect(`https://dweb.link/ipfs/${b64Cid}`),
      'https://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi.ipfs.dweb.link/'
    )
  })

  it('/ipfs/ with z-prefixed base58btc CIDv1 redirects to base32 subdomain', async () => {
    const knownBytes = base32Decode('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'.substring(1))
    const zCid = 'z' + base58Encode(knownBytes)
    assert.equal(
      await fetchRedirect(`https://dweb.link/ipfs/${zCid}`),
      'https://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi.ipfs.dweb.link/'
    )
  })

  it('/ipfs/ with uppercase F base16 CIDv1 redirects to base32 subdomain', async () => {
    const knownBytes = base32Decode('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'.substring(1))
    const hexCid = 'F' + toHex(knownBytes)
    assert.equal(
      await fetchRedirect(`https://dweb.link/ipfs/${hexCid}`),
      'https://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi.ipfs.dweb.link/'
    )
  })

  it('/ipns/ with DNSLink domain preserves sub-path and query params', async () => {
    assert.equal(
      await fetchRedirect('https://inbrowser.link/ipns/en.wikipedia-on-ipfs.org/wiki/Foo?query=val'),
      'https://en-wikipedia--on--ipfs-org.ipns.inbrowser.link/wiki/Foo?query=val'
    )
  })

  it('/ipns/ with bare base58btc peer ID redirects to base36 subdomain', async () => {
    const key = 'k51qzi5uqu5dlxjl6owpco0tn82bed1444cng351cnc48odwnr7e9pmx4nmmkh'
    const ipnsBytes = base36Decode(key.substring(1))
    const bareB58 = base58Encode(ipnsBytes)
    assert.equal(
      await fetchRedirect(`https://dweb.link/ipns/${bareB58}/path`),
      `https://${key}.ipns.dweb.link/path`
    )
  })
})
