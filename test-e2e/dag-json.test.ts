import * as dagJson from '@ipld/dag-json'
import { stop } from '@libp2p/interface'
import { createKuboRPCClient } from 'kubo-rpc-client'
import { CID } from 'multiformats/cid'
import { test, expect } from './fixtures/config-test-fixtures.ts'
import { IPLD_CONVERSIONS } from './fixtures/ipld-conversions.ts'
import { loadWithServiceWorker } from './fixtures/load-with-service-worker.ts'
import type { KuboRPCClient } from 'kubo-rpc-client'

const object = {
  hello: 'world'
}

test.describe('dag-json', () => {
  let kubo: KuboRPCClient
  let cid: CID
  let block: Uint8Array

  test.beforeEach(async () => {
    kubo = createKuboRPCClient(process.env.KUBO_RPC)

    block = dagJson.encode(object)
    cid = await kubo.block.put(block, {
      format: 'dag-json'
    })
  })

  test.afterEach(async () => {
    await stop(kubo)
  })

  test('should return dag-json block', async ({ page, baseURL }) => {
    const response = await loadWithServiceWorker(page, `${baseURL}/ipfs/${cid}?download=true`)

    expect(response.status()).toBe(200)

    const headers = await response.allHeaders()
    expect(headers['content-type']).toContain('application/vnd.ipld.dag-json')
    expect(headers['cache-control']).toBe('public, max-age=29030400, immutable')
    expect(headers['content-disposition']).toContain('attachment')

    expect(dagJson.decode(await response?.body())).toStrictEqual(object)
  })

  test('should return dag-json block as raw', async ({ page, baseURL }) => {
    const response = await loadWithServiceWorker(page, `${baseURL}/ipfs/${cid}?format=raw&download=true`)

    expect(response.status()).toBe(200)

    const headers = await response.allHeaders()
    expect(headers['content-type']).toContain('application/vnd.ipld.raw')
    expect(headers['cache-control']).toBe('public, max-age=29030400, immutable')
    expect(headers['content-disposition']).toContain('attachment')

    expect(dagJson.decode(await response?.body())).toStrictEqual(object)
  })

  for (const conversion of IPLD_CONVERSIONS) {
    // eslint-disable-next-line no-loop-func
    test(`should return dag-json block as ${conversion.format}`, async ({ page, baseURL }) => {
      const response = await loadWithServiceWorker(page, `${baseURL}/ipfs/${cid}?format=${conversion.format}&download=true`)

      expect(response.status()).toBe(200)

      const headers = await response.allHeaders()
      expect(headers['content-type']).toContain(conversion.mediaType)
      expect(headers['cache-control']).toBe('public, max-age=29030400, immutable')
      expect(headers['content-disposition']).toContain(conversion.disposition)
      expect(headers['content-disposition']).toContain(conversion.filename(cid))

      if (headers['content-type'].includes('application/json') || headers['content-type'].includes('application/cbor')) {
        expect(new Uint8Array(await response.body())).toStrictEqual(block)
      } else {
        expect(await conversion.decode(response)).toStrictEqual(object)
      }
    })
  }
})
