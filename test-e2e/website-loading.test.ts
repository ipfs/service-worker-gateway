import { test, expect } from './fixtures/config-test-fixtures.ts'
import { loadWithServiceWorker } from './fixtures/load-with-service-worker.ts'
import { loadBypassingMediaViewer } from './fixtures/media-viewer.ts'

test.describe('website-loading', () => {
  test('ensure unixfs directory trailing slash is added', async ({ page, baseURL }) => {
    const cid = 'bafybeifq2rzpqnqrsdupncmkmhs3ckxxjhuvdcbvydkgvch3ms24k5lo7q'
    const response = await loadWithServiceWorker(page, `${baseURL}/ipfs/${cid}`)

    // playwright follows redirects so we won't see the 301
    expect(response?.status()).toBe(200)
  })

  test('ensure that index.html is returned for the root path', async ({ page, baseURL }) => {
    const cid = 'bafybeifq2rzpqnqrsdupncmkmhs3ckxxjhuvdcbvydkgvch3ms24k5lo7q'
    const response = await loadWithServiceWorker(page, `${baseURL}/ipfs/${cid}/`)

    expect(response.status()).toBe(200)

    const headers = await response.allHeaders()
    expect(headers['content-type']).toContain('text/html')
    expect(headers['cache-control']).toBe('public, max-age=29030400, immutable')

    const bodyBuffer = await response?.body()
    expect(bodyBuffer?.byteLength).toBe(6)
    const bodyText = await response?.text()
    expect(bodyText).toBe('hello\n')
  })

  test('ensure query string params are retained on reload', async ({ page, baseURL }) => {
    const cid = 'bafkqablimvwgy3y'
    // First navigation: bypass the media-viewer wrapper (#574) so we can
    // assert the bare text/plain header.
    const response = await loadBypassingMediaViewer(page, `${baseURL}/ipfs/${cid}`)

    expect(response.status()).toBe(200)

    const headers = await response.allHeaders()
    expect(headers['content-type']).toContain('text/plain')

    // `?filename=index.html` makes verified-fetch return text/html, which is
    // not in the wrapper's content-type list, so this navigation renders the
    // page content directly without needing the bypass.
    const responseWithFilename = await loadWithServiceWorker(page, `${baseURL}/ipfs/${cid}?filename=index.html`)

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
