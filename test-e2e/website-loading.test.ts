import { testPathRouting as test, expect } from './fixtures/config-test-fixtures.js'

test.describe('website-loading', () => {
  test.beforeEach(async ({ page }) => {
    // we need to send a request to the service worker to accept the origin isolation warning
    await page.evaluate(async () => {
      const response = await fetch('?ipfs-sw-accept-origin-isolation-warning=true')
      if (!response.ok) {
        throw new Error('Failed to accept origin isolation warning')
      }
    })
  })
  test('ensure unixfs directory trailing slash is added', async ({ page }) => {
    const response = await page.goto('http://127.0.0.1:3333/ipfs/bafybeifq2rzpqnqrsdupncmkmhs3ckxxjhuvdcbvydkgvch3ms24k5lo7q')

    // playwright follows redirects so we won't see the 301
    expect(response?.status()).toBe(200)
    await page.waitForURL(/http:\/\/127\.0\.0\.1:3333\/ipfs\/bafybeifq2rzpqnqrsdupncmkmhs3ckxxjhuvdcbvydkgvch3ms24k5lo7q/)
  })

  test('ensure that index.html is returned for the root path', async ({ page }) => {
    const response = await page.goto('http://127.0.0.1:3333/ipfs/bafybeifq2rzpqnqrsdupncmkmhs3ckxxjhuvdcbvydkgvch3ms24k5lo7q/')

    expect(response?.status()).toBe(200)
    const headers = await response?.allHeaders()

    expect(headers?.['content-type']).toContain('text/html')
    expect(headers?.['cache-control']).toBe('public, max-age=29030400, immutable')

    const bodyBuffer = await response?.body()
    expect(bodyBuffer?.byteLength).toBe(6)
    const bodyText = await response?.text()
    expect(bodyText).toBe('hello\n')
  })
})
