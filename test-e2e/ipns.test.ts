import { peerIdFromString } from '@libp2p/peer-id'
import { CID } from 'multiformats'
import { base36 } from 'multiformats/bases/base36'
import { identity } from 'multiformats/hashes/identity'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { CODE_RAW } from '../src/ui/pages/multicodec-table.ts'
import { test, expect } from './fixtures/config-test-fixtures.ts'
import { loadWithServiceWorker } from './fixtures/load-with-service-worker.ts'
import { publishDNSLink } from './fixtures/serve/dns-record-cache.ts'

test.describe('ipns', () => {
  test('should resolve IPNS name and return as dag-json', async ({ page, baseURL }) => {
    const name = 'k51qzi5uqu5dhjghbwdvbo6mi40htrq6e2z4pwgp15pgv3ho1azvidttzh8yy2'
    const cid = 'baguqeeram5ujjqrwheyaty3w5gdsmoz6vittchvhk723jjqxk7hakxkd47xq'

    const response = await loadWithServiceWorker(page, `${baseURL}/ipns/${name}?format=dag-json`)

    expect(response.status()).toBe(200)

    const headers = await response.allHeaders()
    expect(headers?.['content-type']).toContain('application/vnd.ipld.dag-json')
    expect(headers?.['cache-control']).toBe('public, max-age=3155760000')
    expect(headers?.['etag']).toBe(`"${cid}.dag-json"`)
    expect(headers?.['x-ipfs-path']).toBe(`/ipns/${name}`)

    expect(await response?.json()).toStrictEqual({
      foo: {
        link: {
          '/': 'baguqeeraxpdqyfizawpb7zl5gnpg7jw3myuynb42ngzmeo7xn5kmm5pabt6q'
        },
        object: {
          banana: 10,
          monkey: false
        }
      }
    })
  })

  test('should redirect b58 IPNS name in path gateway to CIDv1 b36 libp2p key', async ({ page, baseURL, protocol, host }) => {
    // @see TestRedirectCanonicalIPNS/GET_for_%2Fipns%2F%7Bb58-multihash-of-ed25519-key%7D_redirects_to_%2Fipns%2F%7Bcidv1-libp2p-key-base36%7D
    const name = '12D3KooWRBy97UB99e3J6hiPesre1MZeuNQvfan4gBziswrRJsNK'
    const peerId = peerIdFromString(name)
    const key = peerId.toCID().toString(base36)

    const response = await loadWithServiceWorker(page, `${baseURL}/ipns/${name}/root2`, {
      redirect: `${protocol}//${key}.ipns.${host}/root2`
    })

    // performed redirect to re-encoded IPNS name but we can't resolve record so
    // expect a 504
    expect(response.status()).toBe(504)
  })

  test('should load an IPNS domain', async ({ page, baseURL }) => {
    const domain = 'ipns-happy-path.com'
    const cid = CID.createV1(CODE_RAW, identity.digest(uint8ArrayFromString('hello world')))

    await publishDNSLink(domain, cid)

    // TODO: use rootDomain
    const response = await loadWithServiceWorker(page, `${baseURL}/ipns/${domain}`)

    expect(response.status()).toBe(200)
    expect(await response.text()).toContain('hello world')
  })

  test('should load an IPNS domain with a path', async ({ page, baseURL }) => {
    const domain = 'ipns-with-path.com'
    const cid = CID.parse('bafybeib3ffl2teiqdncv3mkz4r23b5ctrwkzrrhctdbne6iboayxuxk5ui')
    const path = 'root2/root3/root4'

    await publishDNSLink(domain, cid)

    // TODO: use rootDomain
    const response = await loadWithServiceWorker(page, `${baseURL}/ipns/${domain}/${path}`)

    expect(response.status()).toBe(200)
    expect(await response.text()).toContain('hello')
  })
})
