import { testPathRouting as test, expect } from './fixtures/config-test-fixtures.js'
import { loadWithServiceWorker } from './fixtures/load-with-service-worker.js'

test.describe('website-loading', () => {
  test('ensure unixfs directory trailing slash is added', async ({ page, protocol, rootDomain }) => {
    const cid = 'bafybeifq2rzpqnqrsdupncmkmhs3ckxxjhuvdcbvydkgvch3ms24k5lo7q'
    const response = await loadWithServiceWorker(page, `${protocol}//${rootDomain}/ipfs/${cid}`, {
      redirect: rootDomain.includes('localhost') ? `${protocol}//${cid}.ipfs.${rootDomain}/` : `${protocol}//${rootDomain}/ipfs/${cid}/`
    })

    // playwright follows redirects so we won't see the 301
    expect(response?.status()).toBe(200)
    await page.waitForURL(/http:\/\/127\.0\.0\.1:3333\/ipfs\/bafybeifq2rzpqnqrsdupncmkmhs3ckxxjhuvdcbvydkgvch3ms24k5lo7q/)
  })

  test('ensure that index.html is returned for the root path', async ({ page, protocol, rootDomain }) => {
    const cid = 'bafybeifq2rzpqnqrsdupncmkmhs3ckxxjhuvdcbvydkgvch3ms24k5lo7q'
    const response = await loadWithServiceWorker(page, `${protocol}//${rootDomain}/ipfs/${cid}/`, {
      redirect: rootDomain.includes('localhost') ? `${protocol}//${cid}.ipfs.${rootDomain}/` : undefined
    })

    expect(response.status()).toBe(200)

    const headers = await response.allHeaders()
    expect(headers['content-type']).toContain('text/html')
    expect(headers['cache-control']).toBe('public, max-age=29030400, immutable')

    const bodyBuffer = await response?.body()
    expect(bodyBuffer?.byteLength).toBe(6)
    const bodyText = await response?.text()
    expect(bodyText).toBe('hello\n')
  })

  test('ensure query string params are retained on reload', async ({ page, protocol, rootDomain }) => {
    const cid = 'bafkqablimvwgy3y'
    const response = await loadWithServiceWorker(page, `${protocol}//${rootDomain}/ipfs/${cid}`, {
      redirect: rootDomain.includes('localhost') ? `${protocol}//${cid}.ipfs.${rootDomain}` : undefined
    })

    expect(response.status()).toBe(200)

    const headers = await response.allHeaders()
    expect(headers['content-type']).toContain('text/plain')

    const responseWithFilename = await loadWithServiceWorker(page, `${protocol}//${rootDomain}/ipfs/${cid}?filename=index.html`, {
      redirect: rootDomain.includes('localhost') ? `${protocol}//${cid}.ipfs.${rootDomain}?filename=index.html` : undefined
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

  test('ensure HTML files have the correct content type', async ({ page, protocol, rootDomain }) => {
    const cid = 'bafybeifq2rzpqnqrsdupncmkmhs3ckxxjhuvdcbvydkgvch3ms24k5lo7q'
    const response = await loadWithServiceWorker(page, `${protocol}//${rootDomain}/ipfs/${cid}/index.html`, {
      redirect: rootDomain.includes('localhost') ? `${protocol}//${cid}.ipfs.${rootDomain}/index.html` : undefined
    })

    expect(response.status()).toBe(200)

    const headers = await response.allHeaders()
    expect(headers['content-type']).toContain('text/html')
    expect(headers['cache-control']).toBe('public, max-age=29030400, immutable')

    const bodyBuffer = await response?.body()
    expect(bodyBuffer?.byteLength).toBe(6)
    const bodyText = await response?.text()
    expect(bodyText).toBe('hello\n')
  })
})
