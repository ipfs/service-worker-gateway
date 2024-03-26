import { test as base, type Page } from '@playwright/test'
import { setConfig, setSubdomainConfig } from './set-sw-config.js'
import { waitForServiceWorker } from './wait-for-service-worker.js'

/**
 * You should use this fixture instead of the `test` fixture from `@playwright/test` when testing path routing via the service worker.
 */
export const testPathRouting = base.extend({
  page: async ({ page }, use) => {
    await page.goto('http://127.0.0.1:3333', { waitUntil: 'networkidle' })
    await waitForServiceWorker(page)
    await setConfig({
      page,
      config: {
        gateways: [process.env.KUBO_GATEWAY as string],
        routers: [process.env.KUBO_GATEWAY as string]
      }
    })

    await use(page)
  }
})

/**
 * When testing subdomain routing via the service worker, using this fixture will automatically set the config for the subdomain.
 * This is useful for testing subdomain routing without having to manually set the config for each subdomain.
 *
 * @example
 *
 * ```ts
 * import { testSubdomainRouting as test, expect } from './fixtures/config-test-fixtures.js'
 *
 * test.describe('subdomain-detection', () => {
 *   test('path requests are redirected to subdomains', async ({ page }) => {
 *     await page.goto('http://bafkqablimvwgy3y.ipfs.localhost:3333/', { waitUntil: 'networkidle' })
 *     const bodyTextLocator = page.locator('body')
 *     await expect(bodyTextLocator).toContainText('hello')
 *   })
 * })
 * ```
 */
export const testSubdomainRouting = base.extend({
  page: async ({ page }, use) => {
    await page.goto('http://localhost:3333', { waitUntil: 'networkidle' })
    await waitForServiceWorker(page)

    const oldPageGoto = page.goto.bind(page)
    page.goto = async (url: Parameters<Page['goto']>[0], options: Parameters<Page['goto']>[1]): ReturnType<Page['goto']> => {
      const response = await oldPageGoto(url, options)
      if (['.ipfs.', '.ipns.'].some((part) => url.includes(part))) {
        await setSubdomainConfig({
          page,
          config: {
            autoReload: true,
            gateways: [process.env.KUBO_GATEWAY as string],
            routers: [process.env.KUBO_GATEWAY as string]
          }
        })
      } else {
        // already set on root.
      }
      return response
    }

    // set config for the initial page
    await setConfig({
      page,
      config: {
        autoReload: true,
        gateways: [process.env.KUBO_GATEWAY as string],
        routers: [process.env.KUBO_GATEWAY as string]
      }
    })

    await use(page)
  }
})

export { expect } from '@playwright/test'
