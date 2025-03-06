import { testPathRouting as test, expect } from './fixtures/config-test-fixtures.js'

test.describe('hamt-dir', () => {
  test.beforeEach(async ({ page }) => {
    // we need to send a request to the service worker to accept the origin isolation warning
    await page.evaluate(async () => {
      const response = await fetch('/#/ipfs-sw-accept-origin-isolation-warning')
      if (!response.ok) {
        throw new Error('Failed to accept origin isolation warning')
      }
    })
  })
  test('can open UnixFS file from HAMT-sharded directory', async ({ page }) => {
    const response = await page.goto('http://127.0.0.1:3333/ipfs/bafybeidbclfqleg2uojchspzd4bob56dqetqjsj27gy2cq3klkkgxtpn4i/685.txt')

    expect(response?.status()).toBe(200)
    const headers = await response?.allHeaders()

    expect(headers?.['content-type']).toContain('text/plain')
    expect(headers?.['cache-control']).toBe('public, max-age=29030400, immutable')

    const bodyBuffer = await response?.body()
    expect(bodyBuffer?.byteLength).toBe(1026)
  })
})
