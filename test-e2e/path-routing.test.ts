import { test, expect } from './fixtures/config-test-fixtures.ts'
import { loadBypassingMediaViewer } from './fixtures/media-viewer.ts'

test.describe('path-routing', () => {
  test('can load identity CID via path', async ({ page, baseURL }) => {
    const cid = 'bafkqablimvwgy3y'
    // Bypass the media-viewer wrapper (#574); since the browser writes the
    // response straight to disk we read the body off the response object
    // instead of `page.textContent`.
    const response = await loadBypassingMediaViewer(page, `${baseURL}/ipfs/${cid}`)

    const headers = await response?.allHeaders()
    expect(headers?.['content-type']).toBe('text/plain; charset=utf-8')
    expect(headers?.['cache-control']).toBe('public, max-age=29030400, immutable')

    // expect downloaded body to contain 'hello'
    expect(await response.text()).toContain('hello')
  })
})
