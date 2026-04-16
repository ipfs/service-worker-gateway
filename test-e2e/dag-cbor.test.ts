import * as dagCbor from '@ipld/dag-cbor'
import * as cbor from 'cborg'
import { createKuboRPCClient } from 'kubo-rpc-client'
import { CID } from 'multiformats/cid'
import { test, expect } from './fixtures/config-test-fixtures.ts'
import { loadWithServiceWorker } from './fixtures/load-with-service-worker.ts'
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

  test(`should return dag-cbor block as cbor`, async ({ page, baseURL }) => {
    const response = await loadWithServiceWorker(page, `${baseURL}/ipfs/${cid}?format=cbor&download=true`)
    expect(response.status()).toBe(200)

    const headers = await response.allHeaders()
    expect(headers['content-type']).toContain('application/cbor')
    expect(headers['cache-control']).toBe('public, max-age=29030400, immutable')
    expect(headers['content-disposition']).toContain('attachment')
    expect(headers['content-disposition']).toContain(`${cid}.cbor`)

    expect(await cbor.decode(await response.body())).toStrictEqual(object)
  })
})
