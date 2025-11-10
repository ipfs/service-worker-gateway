import { allowInsecureWebsiteAccess } from './allow-insecure-website-access.js'
import { testPathRouting as test, expect } from './fixtures/config-test-fixtures.js'
import { waitForServiceWorker } from './fixtures/wait-for-service-worker.js'

test.describe('website-loading', () => {
  test.beforeEach(async ({ page }) => {
    await waitForServiceWorker(page)
    await allowInsecureWebsiteAccess(page)
  })

  test('ensure unixfs directory trailing slash is added', async ({ page }) => {
    const response = await page.goto('http://127.0.0.1:3333/ipfs/bafybeifq2rzpqnqrsdupncmkmhs3ckxxjhuvdcbvydkgvch3ms24k5lo7q', {
      waitUntil: 'networkidle'
    })

    // playwright follows redirects so we won't see the 301
    expect(response?.status()).toBe(200)
    await page.waitForURL(/http:\/\/127\.0\.0\.1:3333\/ipfs\/bafybeifq2rzpqnqrsdupncmkmhs3ckxxjhuvdcbvydkgvch3ms24k5lo7q/)
  })

  test('ensure that index.html is returned for the root path', async ({ page }) => {
    const response = await page.goto('http://127.0.0.1:3333/ipfs/bafybeifq2rzpqnqrsdupncmkmhs3ckxxjhuvdcbvydkgvch3ms24k5lo7q/', {
      waitUntil: 'networkidle'
    })

    expect(response?.status()).toBe(200)
    const headers = await response?.allHeaders()

    expect(headers?.['content-type']).toContain('text/html')
    expect(headers?.['cache-control']).toBe('public, max-age=29030400, immutable')

    const bodyBuffer = await response?.body()
    expect(bodyBuffer?.byteLength).toBe(6)
    const bodyText = await response?.text()
    expect(bodyText).toBe('hello\n')
  })

  test('ensure query string params are retained on reload', async ({ page }) => {
    const response = await page.goto('http://127.0.0.1:3333/ipfs/bafkqablimvwgy3y', {
      waitUntil: 'networkidle'
    })
    expect(response?.status()).toBe(200)
    const headers = await response?.allHeaders()
    expect(headers?.['content-type']).toContain('text/plain')

    const responseWithFilename = await page.goto('http://127.0.0.1:3333/ipfs/bafkqablimvwgy3y?filename=index.html', {
      waitUntil: 'networkidle'
    })
    expect(responseWithFilename?.status()).toBe(200)
    const headersWithFilename = await responseWithFilename?.allHeaders()
    expect(headersWithFilename?.['content-type']).toContain('text/html')

    const responseAfterReloading = await page.reload({
      waitUntil: 'networkidle'
    })
    expect(responseAfterReloading?.status()).toBe(200)
    const headersAfterReloading = await responseAfterReloading?.allHeaders()
    expect(headersAfterReloading?.['content-type']).toContain('text/html')
  })
})
