import { test, expect } from './fixtures/config-test-fixtures.js'
import { handleOriginIsolationWarning } from './fixtures/handle-origin-isolation-warning.js'
import { swScopeVerification } from './fixtures/sw-scope-verification.js'

test.afterEach(async ({ page }) => {
  await swScopeVerification(page, expect)
})

test.describe('first-hit ipfs-hosted', () => {
  /**
   * "ipfs-hosted" tests verify that when the _redirects is hit and redirects to
   * the <root>?helia-redirect=<path> that navigation is handled correctly.
   */
  test.describe('path-routing', () => {
    test.beforeAll(async ({ rootDomain }) => {
      if (!rootDomain.includes('localhost') || process.env.BASE_URL != null) {
        test.skip()
      }
    })

    test('loads the index page from the root when an path is present', async ({ page }) => {
      const response = await page.goto('http://127.0.0.1:3334/ipfs/bafkqablimvwgy3y', {
        waitUntil: 'networkidle'
      })

      // first loads the root page
      expect(response?.status()).toBe(200)
      const headers = await response?.allHeaders()

      // accept the warning
      await handleOriginIsolationWarning(page)

      expect(headers?.['content-type']).toContain('text/html')

      // wait for loading page to finish '.loading-page' to be removed
      await page.waitForSelector('.loading-page', { state: 'detached' })

      // and we verify the content was returned
      await page.waitForSelector('text=hello', {
        timeout: 25_000
      })
    })
  })

  test.describe('subdomain-routing', () => {
    test.beforeAll(async () => {
      if (['webkit', 'safari'].includes(test.info().project.name)) {
        // @see https://github.com/ipfs/in-web-browsers/issues/206
        test.skip()
      }
    })

    test('redirects to subdomain gateway', async ({ page, rootDomain, protocol }) => {
      const response = await page.goto('http://localhost:3334/ipfs/bafkqablimvwgy3y')

      // first loads the root page
      expect(response?.status()).toBe(200)
      const headers = await response?.allHeaders()

      expect(headers?.['content-type']).toContain('text/html')
      await page.waitForURL('http://bafkqablimvwgy3y.ipfs.localhost:3334', {
        timeout: 10_000
      })

      // wait for loading page to finish '.loading-page' to be removed
      await page.waitForSelector('.loading-page', { state: 'detached' })

      // and we verify the content was returned
      await page.waitForSelector('text=hello', {
        timeout: 25_000
      })
    })

    test('redirects to subdomain gateway with extra query params', async ({ page }) => {
      const response = await page.goto('http://localhost:3334/ipfs/bafkqablimvwgy3y?foo=bar')

      expect(response?.url()).toBe('http://localhost:3334/ipfs/bafkqablimvwgy3y?foo=bar')

      // first loads the root page
      expect(response?.status()).toBe(200)

      // wait for redirect
      await expect(page).toHaveURL('http://bafkqablimvwgy3y.ipfs.localhost:3334/?foo=bar')
      await page.waitForSelector('text=hello', {
        timeout: 25_000
      })
    })
  })
})

test.describe('first-hit direct-hosted', () => {
  /**
   * "direct-hosted" tests verify that when an unrecognized path is hit (prior
   * to the service worker being registered) that navigation is handled
   * correctly.
   *
   * This depends on the reverse-proxy being configured to redirect all requests
   * to the root domain.
   */
  test.describe('path-routing', () => {
    test.beforeAll(async ({ rootDomain }) => {
      if (!rootDomain.includes('localhost') || process.env.BASE_URL != null) {
        test.skip()
      }
    })

    test('requests to new pages are redirected', async ({ page, baseURL }) => {
      const response = await page.goto('http://127.0.0.1:3333/ipfs/bafkqablimvwgy3y', {
        waitUntil: 'commit'
      })

      // first loads the root page
      expect(response?.status()).toBe(200)

      await handleOriginIsolationWarning(page)

      await page.waitForURL('http://127.0.0.1:3333/ipfs/bafkqablimvwgy3y')

      // and we verify the content was returned
      await page.waitForSelector('text=hello', {
        timeout: 25_000
      })
    })
  })

  test.describe('subdomain-routing', () => {
    test.beforeAll(async () => {
      if (['webkit', 'safari'].includes(test.info().project.name)) {
        // @see https://github.com/ipfs/in-web-browsers/issues/206
        test.skip()
      }
    })

    test('requests to new pages are redirected', async ({ page, rootDomain, protocol }) => {
      const response = await page.goto(`${protocol}//${rootDomain}/ipfs/bafkqablimvwgy3y`, {
        waitUntil: 'commit'
      })

      // first loads the root page
      expect(response?.status()).toBe(200)
      const headers = await response?.allHeaders()

      expect(headers?.['content-type']).toContain('text/html')

      // then we should be redirected to the IPFS path
      await expect(page).toHaveURL(`${protocol}//bafkqablimvwgy3y.ipfs.${rootDomain}`, {
        timeout: 10_000
      })

      // wait for loading page to finish '.loading-page' to be removed
      await page.waitForSelector('.loading-page', {
        state: 'detached'
      })

      // and we verify the content was returned
      await page.waitForSelector('text=hello', {
        timeout: 25_000
      })
    })

    test('subdomain with path is redirected to root', async ({ page, rootDomain, protocol }) => {
      const response = await page.goto(`${protocol}//${rootDomain}/ipfs/bafybeigccimv3zqm5g4jt363faybagywkvqbrismoquogimy7kvz2sj7sq/1 - Barrel - Part 1 - alt.txt`, {
        waitUntil: 'commit'
      })

      // first loads the root page
      expect(response?.status()).toBe(200)

      // wait for loading page to finish '.loading-page' to be removed
      await page.waitForSelector('.loading-page', {
        state: 'detached'
      })

      // and we verify the content was returned
      await page.waitForSelector('text=Don\'t we all.')
    })

    test('subdomain with url encoded path and params is redirected to root', async ({ page, rootDomain, protocol }) => {
      // a hard refresh results in path/params being url encoded
      const response = await page.goto(`${protocol}//${rootDomain}/ipfs/bafybeigccimv3zqm5g4jt363faybagywkvqbrismoquogimy7kvz2sj7sq/1%20-%20Barrel%20-%20Part%201%20-%20alt.txt%3Ffilename=foo.html`, {
        waitUntil: 'commit'
      })

      // first loads the root page
      expect(response?.status()).toBe(200)

      // wait for loading page to finish '.loading-page' to be removed
      await page.waitForSelector('.loading-page', {
        state: 'detached'
      })

      // and we verify the content was returned
      await page.waitForSelector('text=Don\'t we all.')
    })

    test('cloudflare-redirect works', async ({ page, rootDomain, protocol }) => {
      // when accessing https://inbrowser.dev/ipfs/bafybeigccimv3zqm5g4jt363faybagywkvqbrismoquogimy7kvz2sj7sq
      // cloudflare will redirect to https://inbrowser.dev/index.html/ipfs/bafybeigccimv3zqm5g4jt363faybagywkvqbrismoquogimy7kvz2sj7sq
      const response = await page.goto(`${protocol}//${rootDomain}/index.html/ipfs/bafybeigccimv3zqm5g4jt363faybagywkvqbrismoquogimy7kvz2sj7sq/1 - Barrel - Part 1 - alt.txt`, {
        waitUntil: 'commit'
      })

      // first loads the root page
      expect(response?.status()).toBe(200)

      await page.waitForURL(`${protocol}//bafybeigccimv3zqm5g4jt363faybagywkvqbrismoquogimy7kvz2sj7sq.ipfs.${rootDomain}/1%20-%20Barrel%20-%20Part%201%20-%20alt.txt`, {
        timeout: 10_000
      })

      await page.waitForSelector('text=Don\'t we all.')
    })
  })
})
