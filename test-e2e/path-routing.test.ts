import { testPathRouting as test, expect } from './fixtures/config-test-fixtures.js'

test.describe('path-routing', () => {
  test('can load identity CID via path', async ({ page }) => {
    const response = await page.goto('http://127.0.0.1:3333/ipfs/bafkqablimvwgy3y', { waitUntil: 'networkidle' })

    expect(response?.status()).toBe(200)

    const headers = await response?.allHeaders()

    expect(headers?.['content-type']).toBe('text/html')
    expect(headers?.['cache-control']).toBe('public, max-age=29030400, immutable')

    // expect page content to contain 'hello'
    const text = await page.textContent('body')
    expect(text).toContain('hello')
  })
})
