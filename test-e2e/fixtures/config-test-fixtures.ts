import { test as base, type Page } from '@playwright/test'
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
  page: async ({ page, rootDomain }, use) => {
    if (!rootDomain.includes('localhost')) {
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
        },
        debug: 'helia*,helia*:trace,libp2p*,libp2p*:trace,*,*:trace',
        enableWss: false,
        enableWebTransport: false,
        enableRecursiveGateways: true,
        enableGatewayProviders: false
      }
    })

    await page.evaluate(async () => {
      await fetch('/#/ipfs-sw-config-reload')
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
    // const kuboGateway = process.env.KUBO_GATEWAY
    // const oldPageGoto = page.goto.bind(page)
    // page.goto = async (url: Parameters<Page['goto']>[0], options: Parameters<Page['goto']>[1]): ReturnType<Page['goto']> => {
    //   const response = await oldPageGoto(url, options)
    //   if (['.ipfs.', '.ipns.'].some((part) => url.includes(part))) {
    //     await setSubdomainConfig({
    //       page,
    //       config: {
    //         autoReload: true,
    //         gateways: [kuboGateway],
    //         routers: [kuboGateway],
    //         dnsJsonResolvers: {
    //           '.': 'https://delegated-ipfs.dev/dns-query'
    //         },
    //         enableWss: true,
    //         enableWebTransport: false,
    //         enableRecursiveGateways: true,
    //         enableGatewayProviders: false
    //       }
    //     })
    //   } else {
    //     // already set on root.
    //   }
    //   return response
    // }

    // set config for the initial page
    await setConfig({
      page,
      config: {
        gateways: [process.env.KUBO_GATEWAY],
        routers: [process.env.KUBO_GATEWAY],
        dnsJsonResolvers: {
          '.': 'https://delegated-ipfs.dev/dns-query'
        },
        debug: 'helia*,helia*:trace,libp2p*,libp2p*:trace,*,*:trace',
        enableWss: false,
        enableWebTransport: false,
        enableRecursiveGateways: true,
        enableGatewayProviders: false
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
