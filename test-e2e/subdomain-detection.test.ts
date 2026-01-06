import { test, testSubdomainRouting, expect } from './fixtures/config-test-fixtures.js'
import { waitForServiceWorker } from './fixtures/wait-for-service-worker.js'

test.describe('subdomain-detection', () => {
  test('path requests are redirected to subdomains', async ({ page, baseURL, rootDomain, protocol }) => {
    if (['webkit', 'safari'].includes(test.info().project.name)) {
      // @see https://github.com/ipfs/in-web-browsers/issues/206
      test.skip()
      return
    }

    await page.goto('/ipfs/bafkqablimvwgy3y', {
      waitUntil: 'commit'
    })

    await page.waitForURL(`${protocol}//bafkqablimvwgy3y.ipfs.${rootDomain}`)
    // wait for config loading and final redirect to complete
    await page.waitForLoadState('networkidle')

    await waitForServiceWorker(page)

    const bodyTextLocator = page.locator('body')
    await expect(bodyTextLocator).toContainText('hello')
  })
})

testSubdomainRouting.describe('subdomain-detection auto fixture', () => {
  testSubdomainRouting('loads subdomains easily', async ({ page, rootDomain, protocol }) => {
    await page.goto(`${protocol}//bafkqablimvwgy3y.ipfs.${rootDomain}/`, {
      waitUntil: 'networkidle'
    })

    const bodyTextLocator = page.locator('body')

    await expect(bodyTextLocator).toContainText('hello')
  })
})
