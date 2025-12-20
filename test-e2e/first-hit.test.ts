import * as dagPb from '@ipld/dag-pb'
import { UnixFS } from 'ipfs-unixfs'
import { CID } from 'multiformats/cid'
import { identity } from 'multiformats/hashes/identity'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { CODE_RAW } from '../src/ui/pages/multicodec-table.ts'
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

    test('loads the index page from the root when a path is present', async ({ page }) => {
      const response = await page.goto('http://127.0.0.1:3334/ipfs/bafkqablimvwgy3y', {
        waitUntil: 'networkidle'
      })

      // first loads the root page
      expect(response?.status()).toBe(200)

      // accept the warning
      await handleOriginIsolationWarning(page)

      const headers = await response?.allHeaders()
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
      const response = await page.goto('http://localhost:3334/ipfs/bafkqablimvwgy3y', {
        waitUntil: 'networkidle'
      })

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
      const response = await page.goto('http://localhost:3334/ipfs/bafkqablimvwgy3y?foo=bar', {
        waitUntil: 'networkidle'
      })

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
      const cid = 'bafkqablimvwgy3y'
      const response = await page.goto(`${protocol}//${rootDomain}/ipfs/${cid}`, {
        waitUntil: 'commit'
      })

      // first loads the root page
      expect(response?.status()).toBe(200)

      const headers = await response?.allHeaders()
      expect(headers?.['content-type']).toContain('text/html')

      // then we should be redirected to the IPFS path
      await expect(page).toHaveURL(`${protocol}//${cid}.ipfs.${rootDomain}`, {
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

    test('subdomain with url encoded path and params is redirected to root', async ({ page, rootDomain, protocol }) => {
      const fileName = 'h d.txt'
      const fileContent = 'hi'
      const fileCid = CID.createV1(CODE_RAW, identity.digest(uint8ArrayFromString(fileContent)))
      const dir = dagPb.encode({
        Data: new UnixFS({
          type: 'directory'
        }).marshal(),
        Links: [{
          Name: fileName,
          Hash: fileCid,
          Tsize: 0
        }]
      })
      const cid = CID.createV1(dagPb.code, identity.digest(dir))

      const response = await page.goto(`${protocol}//${rootDomain}/ipfs/${cid}/${encodeURIComponent(fileName)}?download=false`, {
        waitUntil: 'commit'
      })

      // first loads the root page
      expect(response?.status()).toBe(200)

      const headers = await response?.allHeaders()
      expect(headers?.['content-type']).toContain('text/html')

      // then we should be redirected to the IPFS path
      await expect(page).toHaveURL(`${protocol}//${cid}.ipfs.${rootDomain}/${encodeURIComponent(fileName)}?download=false`, {
        timeout: 10_000
      })

      // wait for loading page to finish '.loading-page' to be removed
      await page.waitForSelector('.loading-page', {
        state: 'detached'
      })

      // and we verify the content was returned
      await page.waitForSelector(`text=${fileContent}`, {
        timeout: 25_000
      })
    })
  })
})
