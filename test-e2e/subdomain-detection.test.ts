import { test, expect } from '@playwright/test'
import { setConfig } from './fixtures/set-sw-config.js'
import { waitForServiceWorker } from './fixtures/wait-for-service-worker.js'

test.describe('subdomain-detection', () => {
  test('path requests are redirected to subdomains', async ({ page, context }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    // wait for service worker to load on main url
    await waitForServiceWorker(page)

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

  test('path requests are redirected to subdomains automatically with autoreload enabled', async ({ page, context }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await waitForServiceWorker(page)

    const initialResponse = await page.goto('/ipfs/bafkqablimvwgy3y', { waitUntil: 'commit' })

    expect(initialResponse?.url()).toBe('http://bafkqablimvwgy3y.ipfs.localhost:3333/')
    expect(initialResponse?.request()?.redirectedFrom()?.url()).toBe('http://localhost:3333/ipfs/bafkqablimvwgy3y')

    await page.waitForURL('http://bafkqablimvwgy3y.ipfs.localhost:3333')
    await setConfig({ page, config: { autoReload: true } })

    const bodyTextLocator = page.locator('body')

    await expect(bodyTextLocator).toContainText('hello')
  })
})
