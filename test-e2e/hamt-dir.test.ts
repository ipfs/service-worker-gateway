import { test, expect } from './fixtures/config-test-fixtures.js'
import { loadWithServiceWorker } from './fixtures/load-with-service-worker.js'

test.describe('hamt-dir', () => {
  test('can open UnixFS file from HAMT-sharded directory', async ({ page, baseURL }) => {
    const cid = 'bafybeidbclfqleg2uojchspzd4bob56dqetqjsj27gy2cq3klkkgxtpn4i'
    const path = '685.txt'

    const response = await loadWithServiceWorker(page, `${baseURL}/ipfs/${cid}/${path}`)

    expect(response.status()).toBe(200)

    const headers = await response.allHeaders()
    expect(headers?.['content-type']).toContain('text/plain')
    expect(headers?.['cache-control']).toBe('public, max-age=29030400, immutable')

    const bodyBuffer = await response?.body()
    expect(bodyBuffer?.byteLength).toBe(1026)
  })
})
