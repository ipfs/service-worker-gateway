import { test } from '@playwright/test'
import { testSubdomainRouting, expect } from './fixtures/config-test-fixtures.js'
import { setConfig, setSubdomainConfig } from './fixtures/set-sw-config.js'
import { waitForServiceWorker } from './fixtures/wait-for-service-worker.js'

test.describe('subdomain-detection', () => {
  test('path requests are redirected to subdomains', async ({ page }) => {
    await page.goto('http://localhost:3333', { waitUntil: 'networkidle' })
    await waitForServiceWorker(page)
    await setConfig({ page, config: { autoReload: false, gateways: [process.env.KUBO_GATEWAY as string], routers: [process.env.KUBO_GATEWAY as string] } })
    const initialResponse = await page.goto('/ipfs/bafkqablimvwgy3y', { waitUntil: 'commit' })

    expect(initialResponse?.url()).toBe('http://bafkqablimvwgy3y.ipfs.localhost:3333/')
    expect(initialResponse?.request()?.redirectedFrom()?.url()).toBe('http://localhost:3333/ipfs/bafkqablimvwgy3y')

    await page.waitForURL('http://bafkqablimvwgy3y.ipfs.localhost:3333')
    const bodyTextLocator = page.locator('body')
    await expect(bodyTextLocator).toContainText('Registering Helia service worker')

    await waitForServiceWorker(page)
    await expect(bodyTextLocator).toContainText('Please save your changes to the config to apply them')

    await page.reload()

    await expect(bodyTextLocator).toContainText('hello')
  })

  test('enabling autoreload automatically loads the subdomain', async ({ page }) => {
    await page.goto('http://bafkqablimvwgy3y.ipfs.localhost:3333/', { waitUntil: 'networkidle' })
    await setSubdomainConfig({ page, config: { autoReload: true, gateways: [process.env.KUBO_GATEWAY as string], routers: [process.env.KUBO_GATEWAY as string] } })

    const bodyTextLocator = page.locator('body')

    await expect(bodyTextLocator).toContainText('hello')
  })
})

testSubdomainRouting.describe('subdomain-detection auto fixture', () => {
  testSubdomainRouting('loads subdomains easily', async ({ page }) => {
    await page.goto('http://bafkqablimvwgy3y.ipfs.localhost:3333/', { waitUntil: 'networkidle' })

    const bodyTextLocator = page.locator('body')

    await expect(bodyTextLocator).toContainText('hello')
  })
})
