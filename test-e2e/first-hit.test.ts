import { test, expect } from './fixtures/config-test-fixtures.js'
import { waitForServiceWorker } from './fixtures/wait-for-service-worker.js'

test.describe('first-hit ipfs-hosted', () => {
  /**
   * "ipfs-hosted" tests verify that when the _redirects is hit and redirects to the <root>?helia-sw=<path> that navigation is handled correctly.
   */
  test.describe('path-routing', () => {
    test.beforeAll(async ({ rootDomain }) => {
      if (!rootDomain.includes('localhost')) {
        test.skip()
      }
    })
    test('redirects to ?helia-sw=<path> are handled', async ({ page }) => {
      const response = await page.goto('http://127.0.0.1:3334/ipfs/bafkqablimvwgy3y')

      expect(response?.url()).toBe('http://127.0.0.1:3334/?helia-sw=/ipfs/bafkqablimvwgy3y')

      // first loads the root page
      expect(response?.status()).toBe(200)
      const headers = await response?.allHeaders()

      expect(headers?.['content-type']).toContain('text/html')

      // then we should be redirected to the IPFS path
      const bodyTextLocator = page.locator('body')
      await expect(bodyTextLocator).toContainText('Click below to load the content with the specified config')
      // and then the normal redirectPage logic:
      await waitForServiceWorker(page)

      // it should render the config iframe
      await expect(page.locator('#redirect-config-iframe')).toBeAttached({ timeout: 1 })

      // wait for the service worker to be registered, and click load content.
      const loadContent = await page.waitForSelector('#load-content', { state: 'visible' })
      await loadContent.click()

      // and we verify the content was returned
      const text = await page.innerText('body')
      expect(text).toBe('hello')
    })
  })

  test.describe('subdomain-routing', () => {
    test('redirects to ?helia-sw=<path> are handled', async ({ page, rootDomain, protocol }) => {
      const response = await page.goto('http://localhost:3334/ipfs/bafkqablimvwgy3y')

      expect(response?.url()).toBe('http://localhost:3334/?helia-sw=/ipfs/bafkqablimvwgy3y')

      // first loads the root page
      expect(response?.status()).toBe(200)
      const headers = await response?.allHeaders()

      expect(headers?.['content-type']).toContain('text/html')

      // then we should be redirected to the IPFS path
      const bodyTextLocator = page.locator('body')
      await page.waitForURL('http://bafkqablimvwgy3y.ipfs.localhost:3334')

      await waitForServiceWorker(page)
      await expect(bodyTextLocator).toContainText('Click below to load the content with the specified config')

      // it should render the config iframe
      await expect(page.locator('#redirect-config-iframe')).toBeAttached({ timeout: 1 })

      await page.reload()

      // and we verify the content was returned
      const text = await page.innerText('body')
      expect(text).toBe('hello')
    })
  })
})

test.describe('first-hit direct-hosted', () => {
  /**
   * "direct-hosted" tests verify that when an unrecognized path is hit (prior to the service worker being registered) that navigation is handled correctly.
   * This depends on the reverse-proxy being configured to redirect all requests to the root domain.
   */
  test.describe('path-routing', () => {
    test.beforeAll(async ({ rootDomain }) => {
      if (!rootDomain.includes('localhost')) {
        test.skip()
      }
    })

    test('requests to new pages are redirected', async ({ page }) => {
      const response = await page.goto('http://127.0.0.1:3333/ipfs/bafkqablimvwgy3y', { waitUntil: 'commit' })

      // first loads the root page
      expect(response?.status()).toBe(200)
      const headers = await response?.allHeaders()

      expect(headers?.['content-type']).toContain('text/html')

      await waitForServiceWorker(page)
      const bodyTextLocator = page.locator('body')
      await expect(bodyTextLocator).toContainText('Click below to load the content with the specified config')

      // it should render the config iframe
      await expect(page.locator('#redirect-config-iframe')).toBeAttached({ timeout: 1 })

      // wait for the service worker to be registered, and click load content.
      const loadContent = await page.waitForSelector('#load-content', { state: 'visible' })
      await loadContent.click()

      // and we verify the content was returned
      const text = await page.innerText('body')
      expect(text).toBe('hello')
    })
  })

  test.describe('subdomain-routing', () => {
    test('requests to new pages are redirected', async ({ page, rootDomain, protocol }) => {
      const response = await page.goto(`${protocol}//${rootDomain}/ipfs/bafkqablimvwgy3y`, { waitUntil: 'commit' })

      // first loads the root page
      expect(response?.status()).toBe(200)
      const headers = await response?.allHeaders()

      expect(headers?.['content-type']).toContain('text/html')

      // then we should be redirected to the IPFS path
      await page.waitForURL(`${protocol}//bafkqablimvwgy3y.ipfs.${rootDomain}`)

      const bodyTextLocator = page.locator('body')

      await waitForServiceWorker(page)
      await expect(bodyTextLocator).toContainText('Click below to load the content with the specified config')

      // it should render the config iframe
      await expect(page.locator('#redirect-config-iframe')).toBeAttached({ timeout: 1 })

      const loadContent = await page.waitForSelector('#load-content', { state: 'visible' })
      await loadContent.click()

      // and we verify the content was returned
      const text = await page.innerText('body')
      expect(text).toBe('hello')
    })
  })
})
