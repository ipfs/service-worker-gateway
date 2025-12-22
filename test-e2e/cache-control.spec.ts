import { stop } from '@libp2p/interface'
import * as cbor from 'cborg'
import { createKuboRPCClient } from 'kubo-rpc-client'
import { testPathRouting as test, expect } from './fixtures/config-test-fixtures.js'
import { makeFetchRequest } from './fixtures/make-range-request.ts'
import { setConfig } from './fixtures/set-sw-config.ts'
import { waitForServiceWorker } from './fixtures/wait-for-service-worker.ts'
import type { KuboRPCClient } from 'kubo-rpc-client'
import type { CID } from 'multiformats/cid'

const object = {
  hello: 'world'
}

test.describe('cache-control', () => {
  let kubo: KuboRPCClient
  let cid: CID
  let block: Uint8Array

  test.beforeEach(async ({ page }) => {
    if (process.env.KUBO_GATEWAY == null || process.env.KUBO_GATEWAY === '') {
      throw new Error('KUBO_GATEWAY not set')
    }

    kubo = createKuboRPCClient(process.env.KUBO_RPC)

    block = cbor.encode(object)
    cid = await kubo.block.put(block, {
      format: 'cbor'
    })

    await waitForServiceWorker(page)
    await setConfig(page, {
      gateways: [
        process.env.KUBO_GATEWAY
      ],
      routers: [
        process.env.KUBO_GATEWAY
      ],
      acceptOriginIsolationWarning: true,
      renderHTMLViews: false
    })
  })

  test.afterEach(async () => {
    await stop(kubo)
  })

  test('should return block that is in local datastore', async ({ page }) => {
    // try offline without block
    const response0 = await makeFetchRequest(page, `/ipfs/${cid}`, {
      headers: {
        'cache-control': 'only-if-cached'
      }
    })
    expect(response0.status()).toBe(412)

    // fetch block from gateway
    const response1 = await makeFetchRequest(page, `/ipfs/${cid}`)
    expect(response1.status()).toBe(200)
    expect(new Uint8Array(await response1.body())).toStrictEqual(block)

    // try again offline, should be cached now
    const response2 = await makeFetchRequest(page, `/ipfs/${cid}`, {
      headers: {
        'cache-control': 'only-if-cached'
      }
    })

    expect(response2.status()).toBe(200)
    expect(new Uint8Array(await response2.body())).toStrictEqual(block)
  })

  test('should return 412 for block that is not in local datastore', async ({ page }) => {
    const response = await makeFetchRequest(page, '/ipfs/bafybeicvjyaiqmgfe7wupl72gpf7cadwyjqf7nzsxrap6npgrgtd3d6m4a', {
      headers: {
        'cache-control': 'only-if-cached'
      }
    })
    expect(response.status()).toBe(412)
  })
})
