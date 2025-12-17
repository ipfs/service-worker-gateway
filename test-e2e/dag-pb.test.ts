import { stop } from '@libp2p/interface'
import { createKuboRPCClient } from 'kubo-rpc-client'
import { testPathRouting as test, expect } from './fixtures/config-test-fixtures.js'
import { loadWithServiceWorker } from './fixtures/load-with-service-worker.js'
import type { KuboRPCClient } from 'kubo-rpc-client'

test.describe('dag-pb', () => {
  let kubo: KuboRPCClient

  test.beforeEach(async () => {
    kubo = createKuboRPCClient(process.env.KUBO_RPC)
  })

  test.afterEach(async () => {
    await stop(kubo)
  })

  test('should load path with percent encoded path', async ({ page, protocol, rootDomain }) => {
    const cid = 'bafybeig675grnxcmshiuzdaz2xalm6ef4thxxds6o6ypakpghm5kghpc34'
    const path = 'Portugal%252C+Espa%C3%B1a=Peninsula%20Ib%C3%A9rica.txt'
    const response = await loadWithServiceWorker(page, `${protocol}//${rootDomain}/ipfs/${cid}/${path}`, {
      redirect: rootDomain.includes('localhost') ? `${protocol}//${cid}.ipfs.${rootDomain}/${path}` : undefined
    })

    expect(response.status()).toBe(200)

    const headers = await response.allHeaders()
    expect(headers['content-type']).toContain('text/plain')
    expect(headers['cache-control']).toBe('public, max-age=29030400, immutable')
  })
})
