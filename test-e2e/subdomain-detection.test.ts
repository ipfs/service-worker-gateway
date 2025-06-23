import { test, testSubdomainRouting, expect } from './fixtures/config-test-fixtures.js'
import { setConfig } from './fixtures/set-sw-config.js'
import { waitForServiceWorker } from './fixtures/wait-for-service-worker.js'

test.describe('subdomain-detection', () => {
  const gateways: string[] = []
  const routers: string[] = []
  test.beforeAll(async () => {
    if (process.env.KUBO_GATEWAY == null || process.env.KUBO_GATEWAY === '') {
      throw new Error('KUBO_GATEWAY not set')
    }
    gateways.push(process.env.KUBO_GATEWAY)
    routers.push(process.env.KUBO_GATEWAY)
  })
  test('path requests are redirected to subdomains', async ({ page, baseURL, rootDomain, protocol }) => {
    if (['webkit', 'safari'].includes(test.info().project.name)) {
      // @see https://github.com/ipfs/in-web-browsers/issues/206
      test.skip()
      return
    }

    await page.goto(baseURL, { waitUntil: 'networkidle' })
    await waitForServiceWorker(page, baseURL)
    await setConfig({
      page,
      config: {
        gateways,
        routers,
        dnsJsonResolvers: {
          '.': 'https://delegated-ipfs.dev/dns-query'
        }
      }
    })
    await page.goto('/ipfs/bafkqablimvwgy3y', { waitUntil: 'commit' })

    await page.waitForURL(`${protocol}//bafkqablimvwgy3y.ipfs.${rootDomain}`)
    const bodyTextLocator = page.locator('body')

    await waitForServiceWorker(page, `${protocol}//bafkqablimvwgy3y.ipfs.${rootDomain}`)

    await expect(bodyTextLocator).toContainText('hello')
  })
})

testSubdomainRouting.describe('subdomain-detection auto fixture', () => {
  testSubdomainRouting('loads subdomains easily', async ({ page, rootDomain, protocol }) => {
    await page.goto(`${protocol}//bafkqablimvwgy3y.ipfs.${rootDomain}/`, { waitUntil: 'networkidle' })

    const bodyTextLocator = page.locator('body')

    await expect(bodyTextLocator).toContainText('hello')
  })
})
