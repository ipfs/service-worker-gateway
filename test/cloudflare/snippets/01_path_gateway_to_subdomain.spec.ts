import { expect } from 'aegir/chai'
import Sinon from 'sinon'
import handler from '../../../src/cloudflare/snippets/01_path_gateway_to_subdomain.ts'
import { base16Encode, base32Decode, base36Decode, base58Encode, base64urlEncode } from '../../../src/cloudflare/snippets/codec.ts'
import type { SinonSandbox } from 'sinon'

// Provide a global fetch stub so the snippet's passthrough calls don't throw.
// The handler calls fetch(request) when it decides not to redirect.
const PASSTHROUGH = Symbol('passthrough')

// Call the real snippet handler and return the Location header or null on passthrough.
async function fetchRedirect (inputUrl: string): Promise<string | undefined | null> {
  const resp = await handler.fetch(new Request(inputUrl))

  // @ts-expect-error custom property added by tests
  if (resp[PASSTHROUGH] != null) {
    return
  }

  return resp.headers.get('Location')
}

describe('01_path_gateway_to_subdomain', () => {
  let sandbox: SinonSandbox

  beforeEach(() => {
    sandbox = Sinon.createSandbox()
    sandbox.replace(globalThis, 'fetch', async () => {
      return Object.assign(new Response(null, { status: 200 }), {
        [PASSTHROUGH]: true
      })
    })
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('/ipfs/ with CIDv0 redirects to base32 CIDv1 subdomain', async () => {
    const resp = await handler.fetch(new Request('https://dweb.link/ipfs/QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR/path?q=1'))
    expect(resp.status).to.equal(301)
    expect(resp.headers.get('Location')).to.equal('https://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi.ipfs.dweb.link/path?q=1')
    expect(resp.headers.get('Cache-Control')).to.equal('public, max-age=31536000, immutable')
  })

  it('/ipfs/ with base32 CIDv1 redirects to subdomain', async () => {
    expect(
      await fetchRedirect('https://dweb.link/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'),
      'https://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi.ipfs.dweb.link/'
    )
  })

  it('/ipns/ with base36 key redirects to subdomain', async () => {
    const key = 'k51qzi5uqu5dlxjl6owpco0tn82bed1444cng351cnc48odwnr7e9pmx4nmmkh'
    const resp = await handler.fetch(new Request(`https://dweb.link/ipns/${key}/file`))
    expect(resp.status).to.equal(301)
    expect(resp.headers.get('Location')).to.equal(`https://${key}.ipns.dweb.link/file`)
    expect(resp.headers.get('Cache-Control')).to.equal('public, max-age=31536000, immutable')
  })

  it('/ipns/ with DNSLink domain redirects to encoded subdomain', async () => {
    expect(
      await fetchRedirect('https://dweb.link/ipns/en.wikipedia-on-ipfs.org/wiki'),
      'https://en-wikipedia--on--ipfs-org.ipns.dweb.link/wiki'
    )
  })

  it('preserves query parameters', async () => {
    expect(
      await fetchRedirect('https://dweb.link/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi?format=car&dag-scope=all'),
      'https://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi.ipfs.dweb.link/?format=car&dag-scope=all'
    )
  })

  it('preserves port numbers', async () => {
    expect(
      await fetchRedirect('http://localhost:8080/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/file'),
      'http://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi.ipfs.localhost:8080/file'
    )
  })

  it('passes through for invalid CID', async () => {
    expect(await fetchRedirect('https://dweb.link/ipfs/not-a-cid')).to.not.be.ok()
  })

  it('passes through for missing identifier', async () => {
    expect(await fetchRedirect('https://dweb.link/ipfs/')).to.not.be.ok()
  })

  it('passes through for non-IPFS paths', async () => {
    expect(await fetchRedirect('https://dweb.link/other/path')).to.not.be.ok()
  })

  it('/ipfs/ with base16 CIDv1 redirects to base32 subdomain', async () => {
    const knownBytes = base32Decode('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'.substring(1))
    const hexCid = 'f' + base16Encode(knownBytes)
    expect(
      await fetchRedirect(`https://dweb.link/ipfs/${hexCid}`),
      'https://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi.ipfs.dweb.link/'
    )
  })

  it('/ipfs/ with base64url CIDv1 redirects to base32 subdomain', async () => {
    const knownBytes = base32Decode('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'.substring(1))
    const b64Cid = 'u' + base64urlEncode(knownBytes)
    expect(
      await fetchRedirect(`https://dweb.link/ipfs/${b64Cid}`),
      'https://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi.ipfs.dweb.link/'
    )
  })

  it('/ipfs/ with z-prefixed base58btc CIDv1 redirects to base32 subdomain', async () => {
    const knownBytes = base32Decode('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'.substring(1))
    const zCid = 'z' + base58Encode(knownBytes)
    expect(
      await fetchRedirect(`https://dweb.link/ipfs/${zCid}`),
      'https://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi.ipfs.dweb.link/'
    )
  })

  it('/ipfs/ with uppercase F base16 CIDv1 redirects to base32 subdomain', async () => {
    const knownBytes = base32Decode('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'.substring(1))
    const hexCid = 'F' + base16Encode(knownBytes)
    expect(
      await fetchRedirect(`https://dweb.link/ipfs/${hexCid}`),
      'https://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi.ipfs.dweb.link/'
    )
  })

  it('/ipns/ with DNSLink domain preserves sub-path and query params', async () => {
    expect(
      await fetchRedirect('https://inbrowser.link/ipns/en.wikipedia-on-ipfs.org/wiki/Foo?query=val'),
      'https://en-wikipedia--on--ipfs-org.ipns.inbrowser.link/wiki/Foo?query=val'
    )
  })

  it('/ipns/ with bare base58btc peer ID redirects to base36 subdomain', async () => {
    const key = 'k51qzi5uqu5dlxjl6owpco0tn82bed1444cng351cnc48odwnr7e9pmx4nmmkh'
    const ipnsBytes = base36Decode(key.substring(1))
    const bareB58 = base58Encode(ipnsBytes)
    expect(
      await fetchRedirect(`https://dweb.link/ipns/${bareB58}/path`),
      `https://${key}.ipns.dweb.link/path`
    )
  })
})
