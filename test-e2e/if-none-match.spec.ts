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

test.describe('if-none-match', () => {
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

  test('should return 304 if the etag matches', async ({ page }) => {
    const response0 = await makeFetchRequest(page, `/ipfs/${cid}`)
    expect(response0.status()).toBe(200)

    const etag = await response0.headerValue('etag') ?? ''
    expect(etag).toContain(cid.toString())

    const response1 = await makeFetchRequest(page, `/ipfs/${cid}`, {
      headers: {
        'if-none-match': etag
      }
    })
    expect(response1.status()).toBe(304)
  })

  test('should return 304 if the etag matches one of the etags', async ({ page }) => {
    const response0 = await makeFetchRequest(page, `/ipfs/${cid}`)
    expect(response0.status()).toBe(200)

    const etag = await response0.headerValue('etag') ?? ''
    expect(etag).toContain(cid.toString())

    const response1 = await makeFetchRequest(page, `/ipfs/${cid}`, {
      headers: {
        'if-none-match': `"foo", W/"bar", ${etag}, "baz"`
      }
    })
    expect(response1.status()).toBe(304)
  })

  test('should return 304 if the etag matches a wildcard', async ({ page }) => {
    const response0 = await makeFetchRequest(page, `/ipfs/${cid}`)
    expect(response0.status()).toBe(200)

    const etag = await response0.headerValue('etag') ?? ''
    expect(etag).toContain(cid.toString())

    const response1 = await makeFetchRequest(page, `/ipfs/${cid}`, {
      headers: {
        'if-none-match': '*'
      }
    })
    expect(response1.status()).toBe(304)
  })

  test('should return 304 if the etag matches a weak value', async ({ page }) => {
    const response0 = await makeFetchRequest(page, `/ipfs/${cid}`)
    expect(response0.status()).toBe(200)

    const etag = await response0.headerValue('etag') ?? ''
    expect(etag).toContain(cid.toString())

    const response1 = await makeFetchRequest(page, `/ipfs/${cid}`, {
      headers: {
        'if-none-match': `W/"${cid}.dag-cbor"`
      }
    })
    expect(response1.status()).toBe(304)
  })
})
