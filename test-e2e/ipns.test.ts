import { peerIdFromString } from '@libp2p/peer-id'
import { base36 } from 'multiformats/bases/base36'
import { base58btc } from 'multiformats/bases/base58'
import { testPathRouting as test, expect } from './fixtures/config-test-fixtures.js'
import { loadWithServiceWorker } from './fixtures/load-with-service-worker.js'
import { setConfig } from './fixtures/set-sw-config.ts'

test.describe('ipns', () => {
  test.beforeEach(async ({ page }) => {
    await setConfig(page, {
      gateways: [
        `${process.env.KUBO_GATEWAY}`
      ],
      routers: [
        `${process.env.KUBO_GATEWAY}`
      ],
      acceptOriginIsolationWarning: true
    })
  })

  test('should resolve IPNS name and return as dag-json', async ({ page, protocol, rootDomain }) => {
    const name = 'k51qzi5uqu5dhjghbwdvbo6mi40htrq6e2z4pwgp15pgv3ho1azvidttzh8yy2'
    const cid = 'baguqeeram5ujjqrwheyaty3w5gdsmoz6vittchvhk723jjqxk7hakxkd47xq'

    const response = await loadWithServiceWorker(page, `${protocol}//${rootDomain}/ipns/${name}?format=dag-json`, {
      redirect: rootDomain.includes('localhost') ? `${protocol}//${name}.ipns.${rootDomain}?format=dag-json` : undefined
    })

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

  test('should redirect b58 IPNS name in path gateway to CIDv1 b36 libp2p key', async ({ page, protocol, rootDomain }) => {
    // @see TestRedirectCanonicalIPNS/GET_for_%2Fipns%2F%7Bb58-multihash-of-ed25519-key%7D_redirects_to_%2Fipns%2F%7Bcidv1-libp2p-key-base36%7D
    const name = '12D3KooWRBy97UB99e3J6hiPesre1MZeuNQvfan4gBziswrRJsNK'
    const peerId = peerIdFromString(name)
    const key = base36.encode(base58btc.decode(`z${name}`))

    const response = await loadWithServiceWorker(page, `${protocol}//${rootDomain}/ipns/${name}/root2/`, {
      redirect: rootDomain.includes('localhost') ? `${protocol}//${key}.ipns.${rootDomain}/root2/` : `${protocol}//${rootDomain}/ipns/${peerId.toCID()}/root2/`
    })

    // performed redirect to re-encoded IPNS name but we can't resolve record so
    // expect a 504
    expect(response.status()).toBe(504)
  })
})
