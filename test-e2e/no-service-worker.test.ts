import { testNoServiceWorker as test, expect } from './fixtures/config-test-fixtures.ts'
import { getNoServiceWorkerError } from './fixtures/locators.ts'

test.describe('no-service-worker', () => {
  test('warning message renders on landing page', async ({ page }) => {
    await page.goto('/', {
      waitUntil: 'networkidle'
    })

    await expect(getNoServiceWorkerError(page)).toBeVisible()
  })

  test('warning message renders on subdomain page', async ({ page, protocol, host }) => {
    await page.goto(`${protocol}//bafkqablimvwgy3y.ipfs.${host}`, {
      waitUntil: 'networkidle'
    })

    await expect(getNoServiceWorkerError(page)).toBeVisible()
  })
})
