import { testPathRouting as test, expect } from './fixtures/config-test-fixtures.js'
import { handleOriginIsolationWarning } from './fixtures/handle-origin-isolation-warning.js'

test.describe('origin isolation warning', () => {
  test('displays when requesting path gateway', async ({ page, baseURL, rootDomain, protocol }) => {
    await page.goto('http://127.0.0.1:3333', { waitUntil: 'networkidle' })
    const testUrl = 'http://127.0.0.1:3333/ipfs/bafkqablimvwgy3y'
    const testURL = new URL(testUrl)
    await page.goto(testUrl)

    await expect(page).toHaveURL(new RegExp(`${encodeURIComponent(testURL.pathname)}#/ipfs-sw-origin-isolation-warning`))

    await handleOriginIsolationWarning(page)

    // wait to be redirected to the test url
    await expect(page).toHaveURL(testUrl)
  })
})
