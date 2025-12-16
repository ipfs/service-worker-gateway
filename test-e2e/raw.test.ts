import { stop } from '@libp2p/interface'
import { createKuboRPCClient } from 'kubo-rpc-client'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { testPathRouting as test, expect } from './fixtures/config-test-fixtures.js'
import { IPLD_CONVERSIONS } from './fixtures/ipld-conversions.ts'
import { loadWithServiceWorker } from './fixtures/load-with-service-worker.js'
import type { KuboRPCClient } from 'kubo-rpc-client'
import type { CID } from 'multiformats/cid'

const object = uint8ArrayFromString('I am a txt file on path with utf8\n')

test.describe('raw', () => {
  let kubo: KuboRPCClient
  let cid: CID

  test.beforeEach(async () => {
    kubo = createKuboRPCClient(process.env.KUBO_RPC)

    cid = await kubo.block.put(object, {
      format: 'raw'
    })
  })

  test.afterEach(async () => {
    await stop(kubo)
  })

  test('should return bytes with text content type', async ({ page, protocol, rootDomain }) => {
    const response = await loadWithServiceWorker(page, `${protocol}//${rootDomain}/ipfs/${cid}?download=true`, {
      redirect: rootDomain.includes('localhost') ? `${protocol}//${cid}.ipfs.${rootDomain}?download=true` : undefined
    })
    expect(response.status()).toBe(200)

    const headers = response.headers()
    expect(headers['content-type']).toContain('text/plain; charset=utf-8')
    expect(headers['cache-control']).toBe('public, max-age=29030400, immutable')

    expect(await response.text()).toContain('I am a txt file on path with utf8')
  })

  test('should return raw block as raw', async ({ page, protocol, rootDomain }) => {
    const response = await loadWithServiceWorker(page, `${protocol}//${rootDomain}/ipfs/${cid}?format=raw&download=true`, {
      redirect: rootDomain.includes('localhost') ? `${protocol}//${cid}.ipfs.${rootDomain}?format=raw&download=true` : undefined
    })

    expect(response.status()).toBe(200)

    const headers = await response.allHeaders()
    expect(headers['content-type']).toContain('application/vnd.ipld.raw')
    expect(headers['cache-control']).toBe('public, max-age=29030400, immutable')
    expect(headers['content-disposition']).toContain('attachment')

    expect(new Uint8Array(await response?.body())).toStrictEqual(object)
  })

  for (const conversion of IPLD_CONVERSIONS) {
    // eslint-disable-next-line no-loop-func
    test(`should return raw block as ${conversion.format}`, async ({ page, protocol, rootDomain }) => {
      const response = await loadWithServiceWorker(page, `${protocol}//${rootDomain}/ipfs/${cid}?format=${conversion.format}&download=true`, {
        redirect: rootDomain.includes('localhost') ? `${protocol}//${cid}.ipfs.${rootDomain}?format=${conversion.format}&download=true` : undefined
      })

      expect(response.status()).toBe(200)

      const headers = await response.allHeaders()
      expect(headers['content-type']).toContain(conversion.mediaType)
      expect(headers['cache-control']).toBe('public, max-age=29030400, immutable')
      expect(headers['content-disposition']).toContain('attachment')

      if (headers['content-type'].includes('application/json')) {
        expect(new Uint8Array(await response.body())).toStrictEqual(object)
      } else {
        expect(await conversion.decode(response)).toStrictEqual(object)
      }
    })
  }
})
