import { test, testSubdomainRouting, expect } from './fixtures/config-test-fixtures.js'
import { setConfig, setSubdomainConfig } from './fixtures/set-sw-config.js'
import { waitForServiceWorker } from './fixtures/wait-for-service-worker.js'

test.describe('subdomain-detection', () => {
  test('path requests are redirected to subdomains', async ({ page, baseURL, rootDomain, protocol }) => {
    await page.goto(baseURL, { waitUntil: 'networkidle' })
    await waitForServiceWorker(page)
    await setConfig({ page, config: { autoReload: false, gateways: [process.env.KUBO_GATEWAY as string], routers: [process.env.KUBO_GATEWAY as string] } })
    const initialResponse = await page.goto('/ipfs/bafkqablimvwgy3y', { waitUntil: 'commit' })

    expect(initialResponse?.url()).toBe(`${protocol}//bafkqablimvwgy3y.ipfs.${rootDomain}/`)
    expect(initialResponse?.request()?.redirectedFrom()?.url()).toBe(`${protocol}//${rootDomain}/ipfs/bafkqablimvwgy3y`)

    await page.waitForURL(`${protocol}//bafkqablimvwgy3y.ipfs.${rootDomain}`)
    const bodyTextLocator = page.locator('body')

    await waitForServiceWorker(page)
    await expect(bodyTextLocator).toContainText('Please save your changes to the config to apply them')

    await page.reload()

    await expect(bodyTextLocator).toContainText('hello')
  })

  test('enabling autoreload automatically loads the subdomain', async ({ page, rootDomain, protocol }) => {
    await page.goto(`${protocol}//bafkqablimvwgy3y.ipfs.${rootDomain}/`, { waitUntil: 'networkidle' })
    await setSubdomainConfig({ page, config: { autoReload: true, gateways: [process.env.KUBO_GATEWAY as string], routers: [process.env.KUBO_GATEWAY as string] } })

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
