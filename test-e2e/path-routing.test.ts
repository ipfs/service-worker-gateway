import { testPathRouting as test, expect } from './fixtures/config-test-fixtures.js'
import { handleOriginIsolationWarning } from './fixtures/handle-origin-isolation-warning.js'

test.describe('path-routing', () => {
  test('can load identity CID via path', async ({ page, swResponses }) => {
    await page.goto('/ipfs/bafkqablimvwgy3y', {
      waitUntil: 'networkidle'
    })

    await handleOriginIsolationWarning(page)

    const lastResponse = swResponses[swResponses.length - 1]
    const headers = await lastResponse?.allHeaders()

    expect(headers?.['content-type']).toBe('text/plain; charset=utf-8')
    expect(headers?.['cache-control']).toBe('public, max-age=29030400, immutable')

    // expect page content to contain 'hello'
    const text = await page.textContent('body')
    expect(text).toContain('hello')
  })
})
