import * as dagCbor from '@ipld/dag-cbor'
import * as cbor from 'cborg'
import { createKuboRPCClient } from 'kubo-rpc-client'
import { CID } from 'multiformats/cid'
import { test, expect } from './fixtures/config-test-fixtures.ts'
import { loadWithServiceWorker } from './fixtures/load-with-service-worker.ts'
import type { KuboRPCClient } from 'kubo-rpc-client'

const object = {
  hello: `world-${Math.random()}`
}

test.describe('gateway hints', () => {
  let gateway: KuboRPCClient
  let cid: CID
  let block: Uint8Array

  test.beforeEach(async () => {
    gateway = createKuboRPCClient(process.env.SECONDARY_GATEWAY_RPC)

    block = dagCbor.encode(object)
    cid = await gateway.block.put(block, {
      format: 'dag-cbor'
    })
  })

  test('should use gateway from url', async ({ page, baseURL }) => {
    if (process.env.SECONDARY_GATEWAY == null) {
      throw new Error('Secondary gateway URL not defined')
    }

    // the default gateway does not have the block
    const response1 = await loadWithServiceWorker(page, `${baseURL}/ipfs/${cid}`)
    expect(response1.status()).toBe(504)

    // try again with a gateway hint
    const response2 = await loadWithServiceWorker(page, `${baseURL}/ipfs/${cid}?gateway=${encodeURIComponent(process.env.SECONDARY_GATEWAY)}`)
    expect(response2.status()).toBe(200)

    expect(cbor.decode(await response2?.body())).toStrictEqual(object)
  })

  test('should remove gateway from url', async () => {

  })
})
