import { testNoServiceWorker as test, expect } from './fixtures/config-test-fixtures.js'
import { getNoServiceWorkerError } from './fixtures/locators.js'

test.describe('no-service-worker', () => {
  test('Error renders on landing page', async ({ page }) => {
    await page.goto('/')

    await expect(getNoServiceWorkerError(page)).toBeVisible()
  })

  test('Error renders on subdomain page', async ({ page, rootDomain, protocol }) => {
    await page.goto(`${protocol ?? 'http'}//bafkqablimvwgy3y.ipfs.${rootDomain}`, { waitUntil: 'networkidle' })

    await expect(getNoServiceWorkerError(page)).toBeVisible()
  })
})
