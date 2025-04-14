import { testPathRouting as test, expect } from './fixtures/config-test-fixtures.js'

test.describe('path-routing', () => {
  test.beforeEach(async ({ page }) => {
    // we need to send a request to the service worker to accept the origin isolation warning
    await page.evaluate(async () => {
      const response = await fetch('?ipfs-sw-accept-origin-isolation-warning=true')
      if (!response.ok) {
        throw new Error('Failed to accept origin isolation warning')
      }
    })
  })

  test('can load identity CID via path', async ({ page }) => {
    const response = await page.goto('/ipfs/bafkqablimvwgy3y', { waitUntil: 'networkidle' })

    await expect(page).toHaveURL(/\/ipfs\/bafkqablimvwgy3y/)

    expect(response?.status()).toBe(200)

    const headers = await response?.allHeaders()

    expect(headers?.['content-type']).toBe('text/plain; charset=utf-8')
    expect(headers?.['cache-control']).toBe('public, max-age=29030400, immutable')

    // expect page content to contain 'hello'
    const text = await page.textContent('body')
    expect(text).toContain('hello')
  })
})
