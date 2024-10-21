import { testPathRouting as test, expect } from './fixtures/config-test-fixtures.js'

test.describe('hamt-dir', () => {
  test('can open UnixFS file from HAMT-sharded directory', async ({ page }) => {
    test.setTimeout(60000)
    const response = await page.goto('http://127.0.0.1:3333/ipfs/bafybeidbclfqleg2uojchspzd4bob56dqetqjsj27gy2cq3klkkgxtpn4i/685.txt')

    expect(response?.status()).toBe(200)
    const headers = await response?.allHeaders()

    expect(headers?.['content-type']).toContain('text/plain')
    expect(headers?.['cache-control']).toBe('public, max-age=29030400, immutable')

    const bodyBuffer = await response?.body()
    expect(bodyBuffer?.byteLength).toBe(1026)
  })
})
