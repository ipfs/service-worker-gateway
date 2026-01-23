import { test, expect } from './fixtures/config-test-fixtures.ts'
import { waitForServiceWorker } from './fixtures/wait-for-service-worker.ts'

test.describe('subdomain-detection', () => {
  test('path requests are redirected to subdomains', async ({ page, protocol, host }) => {
    if (['webkit', 'safari'].includes(test.info().project.name)) {
      // @see https://github.com/ipfs/in-web-browsers/issues/206
      test.skip()
      return
    }

    await page.goto('/ipfs/bafkqablimvwgy3y', {
      waitUntil: 'commit'
    })

    await page.waitForURL(`${protocol}//bafkqablimvwgy3y.ipfs.${host}`)
    // wait for config loading and final redirect to complete
    await page.waitForLoadState('networkidle')

    await waitForServiceWorker(page)

    const bodyTextLocator = page.locator('body')
    await expect(bodyTextLocator).toContainText('hello')
  })
})

test.describe('subdomain-detection auto fixture', () => {
  test('loads subdomains easily', async ({ page, protocol, host }) => {
    await page.goto(`${protocol}//bafkqablimvwgy3y.ipfs.${host}/`, {
      waitUntil: 'networkidle'
    })

    const bodyTextLocator = page.locator('body')

    await expect(bodyTextLocator).toContainText('hello')
  })
})
