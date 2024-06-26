import { test as base, type Page } from '@playwright/test'
import { setConfig, setSubdomainConfig } from './set-sw-config.js'
import { waitForServiceWorker } from './wait-for-service-worker.js'

const rootDomain = async ({ baseURL }, use): Promise<void> => {
  const url = new URL(baseURL)
  await use(url.host)
}
const baseURLProtocol = async ({ baseURL }, use): Promise<void> => {
  const url = new URL(baseURL)
  await use(url.protocol)
}

export const test = base.extend<{ rootDomain: string, baseURL: string, protocol: string }>({
  rootDomain: [rootDomain, { scope: 'test' }],
  protocol: [baseURLProtocol, { scope: 'test' }]
})

/**
 * You should use this fixture instead of the `test` fixture from `@playwright/test` when testing path routing via the service worker.
 */
export const testPathRouting = base.extend<{ rootDomain: string, baseURL: string, protocol: string }>({
  rootDomain: [rootDomain, { scope: 'test' }],
  protocol: [baseURLProtocol, { scope: 'test' }],
  page: async ({ page, rootDomain }, use) => {
    if (!rootDomain.includes('localhost')) {
      // for non localhost tests, we skip path routing tests
      testPathRouting.skip()
      return
    }
    await page.goto('http://127.0.0.1:3333', { waitUntil: 'networkidle' })
    await waitForServiceWorker(page)
    await setConfig({
      page,
      config: {
        gateways: [process.env.KUBO_GATEWAY as string],
        routers: [process.env.KUBO_GATEWAY as string],
        dnsJsonResolvers: {
          '.': 'https://delegated-ipfs.dev/dns-query'
        }
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
 *   test('path requests are redirected to subdomains', async ({ page, rootDomain, protocol }) => {
 *     await page.goto(`${protocol}//bafkqablimvwgy3y.ipfs.${rootDomain}/`, { waitUntil: 'networkidle' })
 *     const bodyTextLocator = page.locator('body')
 *     await expect(bodyTextLocator).toContainText('hello')
 *   })
 * })
 * ```
 */
export const testSubdomainRouting = base.extend<{ rootDomain: string, baseURL: string, protocol: string }>({
  rootDomain: [rootDomain, { scope: 'test' }],
  protocol: [baseURLProtocol, { scope: 'test' }],
  page: async ({ page, baseURL }, use) => {
    await page.goto(baseURL, { waitUntil: 'networkidle' })
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
            routers: [process.env.KUBO_GATEWAY as string],
            dnsJsonResolvers: {
              '.': 'https://delegated-ipfs.dev/dns-query'
            }
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
        routers: [process.env.KUBO_GATEWAY as string],
        dnsJsonResolvers: {
          '.': 'https://delegated-ipfs.dev/dns-query'
        }
      }
    })

    await use(page)
  }
})

export { expect } from '@playwright/test'
