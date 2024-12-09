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
    await page.goto(baseURL, { waitUntil: 'networkidle' })
    await waitForServiceWorker(page)
    await setConfig({
      page,
      config: {
        autoReload: false,
        gateways,
        routers,
        dnsJsonResolvers: {
          '.': 'https://delegated-ipfs.dev/dns-query'
        }
      }
    })
    const initialResponse = await page.goto('/ipfs/bafkqablimvwgy3y', { waitUntil: 'commit' })

    expect(initialResponse?.url()).toBe(`${protocol}//bafkqablimvwgy3y.ipfs.${rootDomain}/`)
    expect(initialResponse?.request()?.redirectedFrom()?.url()).toBe(`${protocol}//${rootDomain}/ipfs/bafkqablimvwgy3y`)

    await page.waitForURL(`${protocol}//bafkqablimvwgy3y.ipfs.${rootDomain}`)
    const bodyTextLocator = page.locator('body')

    await waitForServiceWorker(page)

    await expect(bodyTextLocator).toContainText('hello')
  })

  test('enabling autoreload automatically loads the subdomain', async ({ page, rootDomain, protocol }) => {
    await page.goto(`${protocol}//bafkqablimvwgy3y.ipfs.${rootDomain}/`, { waitUntil: 'networkidle' })
    await setConfig({
      page,
      config: {
        autoReload: true,
        gateways,
        routers,
        dnsJsonResolvers: {
          '.': 'https://delegated-ipfs.dev/dns-query'
        }
      }
    })

    const bodyTextLocator = page.locator('body')

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
