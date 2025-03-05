import { test as base } from '@playwright/test'
import { setConfig } from './set-sw-config.js'
import { waitForServiceWorker } from './wait-for-service-worker.js'

function isNoServiceWorkerProject <T extends typeof base = typeof base> (test: T): boolean {
  return test.info().project.name === 'no-service-worker'
}

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
  protocol: [baseURLProtocol, { scope: 'test' }],
  page: async ({ page }, use) => {
    if (isNoServiceWorkerProject(test)) {
      test.skip()
      return
    }
    await use(page)
  }
})

/**
 * You should use this fixture instead of the `test` fixture from `@playwright/test` when testing path routing via the service worker.
 */
export const testPathRouting = test.extend<{ rootDomain: string, baseURL: string, protocol: string }>({
  rootDomain: [rootDomain, { scope: 'test' }],
  protocol: [baseURLProtocol, { scope: 'test' }],
  // eslint-disable-next-line no-empty-pattern
  baseURL: async ({ }, use) => {
    // Override baseURL to always be http://127.0.0.1:3333 for path routing tests
    await use('http://127.0.0.1:3333')
  },
  page: async ({ page, rootDomain }, use) => {
    if (!rootDomain.includes('localhost') && !rootDomain.includes('127.0.0.1')) {
      // for non localhost tests, we skip path routing tests
      testPathRouting.skip()
      return
    }
    if (process.env.KUBO_GATEWAY == null || process.env.KUBO_GATEWAY === '') {
      throw new Error('KUBO_GATEWAY not set')
    }
    await page.goto('http://127.0.0.1:3333', { waitUntil: 'networkidle' })
    await waitForServiceWorker(page)
    await setConfig({
      page,
      config: {
        gateways: [process.env.KUBO_GATEWAY],
        routers: [process.env.KUBO_GATEWAY],
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
 *
 * TODO: do not set config on subdomains automatically.. this should be done by the application
 */
export const testSubdomainRouting = test.extend<{ rootDomain: string, baseURL: string, protocol: string }>({
  rootDomain: [rootDomain, { scope: 'test' }],
  protocol: [baseURLProtocol, { scope: 'test' }],
  page: async ({ page, baseURL }, use) => {
    await page.goto(baseURL, { waitUntil: 'networkidle' })
    await waitForServiceWorker(page)

    if (process.env.KUBO_GATEWAY == null || process.env.KUBO_GATEWAY === '') {
      throw new Error('KUBO_GATEWAY not set')
    }
    const kuboGateway = process.env.KUBO_GATEWAY

    // set config for the initial page
    await setConfig({
      page,
      config: {
        autoReload: true,
        gateways: [kuboGateway],
        routers: [kuboGateway],
        dnsJsonResolvers: {
          '.': 'https://delegated-ipfs.dev/dns-query'
        }
      }
    })

    await use(page)
  }
})

/**
 * A fixture that skips tests that require the service worker. This is needed in order to test handling of requests where the service worker is not present.
 *
 * @see https://github.com/ipfs/service-worker-gateway/issues/272
 */
export const testNoServiceWorker = base.extend<{ rootDomain: string, baseURL: string, protocol: string }>({
  rootDomain: [rootDomain, { scope: 'test' }],
  protocol: [baseURLProtocol, { scope: 'test' }],
  page: async ({ page }, use) => {
    if (!isNoServiceWorkerProject(testNoServiceWorker)) {
      testNoServiceWorker.skip()
      return
    }
    await use(page)
  }
})

export { expect } from '@playwright/test'
