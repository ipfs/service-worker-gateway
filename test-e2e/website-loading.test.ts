import { testPathRouting as test, expect } from './fixtures/config-test-fixtures.js'

test.describe('website-loading', () => {
  test('ensure unixfs directory trailing slash is added', async ({ page }) => {
    const response = await page.goto('http://127.0.0.1:3333/ipfs/bafybeifq2rzpqnqrsdupncmkmhs3ckxxjhuvdcbvydkgvch3ms24k5lo7q')

    // playwright follows redirects so we won't see the 301
    expect(response?.status()).toBe(200)
    expect(response?.url()).toBe('http://127.0.0.1:3333/ipfs/bafybeifq2rzpqnqrsdupncmkmhs3ckxxjhuvdcbvydkgvch3ms24k5lo7q/')
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
