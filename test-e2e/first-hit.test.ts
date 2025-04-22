import { test, expect } from './fixtures/config-test-fixtures.js'
import { handleOriginIsolationWarning } from './fixtures/handle-origin-isolation-warning.js'
import { swScopeVerification } from './fixtures/sw-scope-verification.js'

test.afterEach(async ({ page }) => {
  await swScopeVerification(page, expect)
})
test.describe('first-hit ipfs-hosted', () => {
  /**
   * "ipfs-hosted" tests verify that when the _redirects is hit and redirects to the <root>?helia-sw=<path> that navigation is handled correctly.
   */
  test.describe('path-routing', () => {
    test.beforeAll(async ({ rootDomain }) => {
      if (!rootDomain.includes('localhost') || process.env.BASE_URL != null) {
        test.skip()
      }
    })
    test('redirects to ?helia-sw=<path> are handled', async ({ page }) => {
      const response = await page.goto('http://127.0.0.1:3334/ipfs/bafkqablimvwgy3y')

      // first loads the root page
      expect(response?.status()).toBe(200)
      const headers = await response?.allHeaders()

      // we redirect to the root path with query param so sw can be registered at the root path
      await expect(page).toHaveURL(`http://127.0.0.1:3334/?helia-sw=${encodeURIComponent('/ipfs/bafkqablimvwgy3y')}`)

      await handleOriginIsolationWarning(page)

      expect(headers?.['content-type']).toContain('text/html')

      // wait for loading page to finish '.loading-page' to be removed
      await page.waitForSelector('.loading-page', { state: 'detached' })

      // and we verify the content was returned
      await page.waitForSelector('text=hello', { timeout: 25000 })
    })
  })

  test.describe('subdomain-routing', () => {
    test('redirects to ?helia-sw=<path> are handled', async ({ page, rootDomain, protocol }) => {
      const response = await page.goto('http://localhost:3334/ipfs/bafkqablimvwgy3y')

      // we no longer redirect to ?helia-sw=<path> for subdomain routing, because we immediately redirect to the subdomain
      // expect(response?.url()).toBe('http://localhost:3334/?helia-sw=/ipfs/bafkqablimvwgy3y')

      // first loads the root page
      expect(response?.status()).toBe(200)
      const headers = await response?.allHeaders()

      expect(headers?.['content-type']).toContain('text/html')
      await expect(page).toHaveURL('http://bafkqablimvwgy3y.ipfs.localhost:3334', { timeout: 10000 })

      // wait for loading page to finish '.loading-page' to be removed
      await page.waitForSelector('.loading-page', { state: 'detached' })

      // and we verify the content was returned
      await page.waitForSelector('text=hello', { timeout: 25000 })
    })

    test('redirects to ?helia-sw=<path> with extra query params are handled', async ({ page }) => {
      const response = await page.goto('http://localhost:3334/ipfs/bafkqablimvwgy3y?foo=bar')

      expect(response?.url()).toBe('http://localhost:3334/ipfs/bafkqablimvwgy3y?foo=bar')

      // first loads the root page
      expect(response?.status()).toBe(200)

      // wait for page to be ?helia-sw=<path>&foo=bar
      await expect(page).toHaveURL('http://bafkqablimvwgy3y.ipfs.localhost:3334/?foo=bar')
      await page.waitForSelector('text=hello', { timeout: 25000 })
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
      if (!rootDomain.includes('localhost') || process.env.BASE_URL != null) {
        test.skip()
      }
    })

    test('requests to new pages are redirected', async ({ page }) => {
      const response = await page.goto('http://127.0.0.1:3333/ipfs/bafkqablimvwgy3y', { waitUntil: 'commit' })

      // first loads the root page
      expect(response?.status()).toBe(200)

      await handleOriginIsolationWarning(page)

      await page.waitForURL('http://127.0.0.1:3333/ipfs/bafkqablimvwgy3y')

      // and we verify the content was returned
      await page.waitForSelector('text=hello', { timeout: 25000 })
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
      await expect(page).toHaveURL(`${protocol}//bafkqablimvwgy3y.ipfs.${rootDomain}`, { timeout: 10000 })

      // wait for loading page to finish '.loading-page' to be removed
      await page.waitForSelector('.loading-page', { state: 'detached' })

      // and we verify the content was returned
      await page.waitForSelector('text=hello', { timeout: 25000 })
    })

    test('subdomain with path is redirected to root', async ({ page, rootDomain, protocol }) => {
      const response = await page.goto(`${protocol}//${rootDomain}/ipfs/bafybeigccimv3zqm5g4jt363faybagywkvqbrismoquogimy7kvz2sj7sq/1 - Barrel - Part 1 - alt.txt`, { waitUntil: 'commit' })

      // first loads the root page
      expect(response?.status()).toBe(200)

      // wait for loading page to finish '.loading-page' to be removed
      await page.waitForSelector('.loading-page', { state: 'detached' })

      // and we verify the content was returned
      await page.waitForSelector('text=Don\'t we all.')
    })
  })
})
