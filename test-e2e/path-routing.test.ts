import { test, expect } from './fixtures/config-test-fixtures.js'
import { loadWithServiceWorker } from './fixtures/load-with-service-worker.ts'

test.describe('path-routing', () => {
  test('can load identity CID via path', async ({ page, baseURL, protocol, host }) => {
    const cid = 'bafkqablimvwgy3y'
    const response = await loadWithServiceWorker(page, `${baseURL}/ipfs/${cid}`, {
      redirect: `${protocol}//${cid}.ipfs.${host}/`
    })

    const headers = await response?.allHeaders()
    expect(headers?.['content-type']).toBe('text/plain; charset=utf-8')
    expect(headers?.['cache-control']).toBe('public, max-age=29030400, immutable')

    // expect page content to contain 'hello'
    const text = await page.textContent('body')
    expect(text).toContain('hello')
  })
})
