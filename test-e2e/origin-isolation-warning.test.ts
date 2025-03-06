import { testPathRouting as test, expect } from './fixtures/config-test-fixtures.js'

test.describe('origin isolation warning', () => {
  test('displays when requesting path gateway', async ({ page, baseURL, rootDomain, protocol }) => {
    await page.goto('http://127.0.0.1:3333', { waitUntil: 'networkidle' })
    const testUrl = 'http://127.0.0.1:3333/ipfs/bafkqablimvwgy3y'
    await page.goto(testUrl)

    await expect(page).toHaveURL(new RegExp(`${encodeURIComponent(testUrl)}#/ipfs-sw-origin-isolation-warning`))

    await expect(page.locator('.e2e-subdomain-warning')).toBeVisible()

    // now click the button to accept the warning
    await page.click('.e2e-subdomain-warning button')

    // wait to be redirected to the test url
    await expect(page).toHaveURL(testUrl)
  })
})
