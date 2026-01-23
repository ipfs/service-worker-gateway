import * as dagCbor from '@ipld/dag-cbor'
import { createKuboRPCClient } from 'kubo-rpc-client'
import { CID } from 'multiformats/cid'
import { test, expect } from './fixtures/config-test-fixtures.js'
import { IPLD_CONVERSIONS } from './fixtures/ipld-conversions.ts'
import { loadWithServiceWorker } from './fixtures/load-with-service-worker.js'
import type { KuboRPCClient } from 'kubo-rpc-client'

const object = {
  hello: 'world'
}

test.describe('dag-cbor', () => {
  let kubo: KuboRPCClient
  let cid: CID
  let block: Uint8Array

  test.beforeEach(async () => {
    kubo = createKuboRPCClient(process.env.KUBO_RPC)

    block = dagCbor.encode(object)
    cid = await kubo.block.put(block, {
      format: 'dag-cbor'
    })
  })

  test('should return dag-cbor block', async ({ page, baseURL }) => {
    const response = await loadWithServiceWorker(page, `${baseURL}/ipfs/${cid}?download=true`)

    expect(response.status()).toBe(200)

    const headers = await response.allHeaders()
    expect(headers['content-type']).toContain('application/vnd.ipld.dag-cbor')
    expect(headers['cache-control']).toBe('public, max-age=29030400, immutable')
    expect(headers['content-disposition']).toContain('attachment')

    expect(dagCbor.decode(await response?.body())).toStrictEqual(object)
  })

  test('should return dag-cbor block as raw', async ({ page, baseURL }) => {
    const response = await loadWithServiceWorker(page, `${baseURL}/ipfs/${cid}?format=raw&download=true`)

    expect(response.status()).toBe(200)

    const headers = await response.allHeaders()
    expect(headers['content-type']).toContain('application/vnd.ipld.raw')
    expect(headers['cache-control']).toBe('public, max-age=29030400, immutable')
    expect(headers['content-disposition']).toContain('attachment')

    expect(dagCbor.decode(await response?.body())).toStrictEqual(object)
  })

  for (const conversion of IPLD_CONVERSIONS) {
    // eslint-disable-next-line no-loop-func
    test(`should return dag-cbor block as ${conversion.format}`, async ({ page, baseURL }) => {
      const response = await loadWithServiceWorker(page, `${baseURL}/ipfs/${cid}?format=${conversion.format}&download=true`)

      expect(response.status()).toBe(200)

      const headers = await response.allHeaders()
      expect(headers['content-type']).toContain(conversion.mediaType)
      expect(headers['cache-control']).toBe('public, max-age=29030400, immutable')
      expect(headers['content-disposition']).toContain(conversion.disposition)
      expect(headers['content-disposition']).toContain(conversion.filename(cid))

      expect(await conversion.decode(response)).toStrictEqual(object)
    })
  }
})
