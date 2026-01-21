import * as dagPb from '@ipld/dag-pb'
import { UnixFS } from 'ipfs-unixfs'
import { CID } from 'multiformats/cid'
import { identity } from 'multiformats/hashes/identity'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { CODE_RAW } from '../src/ui/pages/multicodec-table.ts'
import { test, expect } from './fixtures/config-test-fixtures.js'
import { swScopeVerification } from './fixtures/sw-scope-verification.js'

test.afterEach(async ({ page }) => {
  await swScopeVerification(page, expect)
})

test.describe('first-hit ipfs-hosted', () => {
  test.describe('subdomain-routing', () => {
    test.beforeAll(async () => {
      if (['webkit', 'safari'].includes(test.info().project.name)) {
        // @see https://github.com/ipfs/in-web-browsers/issues/206
        test.skip()
      }
    })

    test('redirects to subdomain gateway', async ({ page, baseURL, protocol, host }) => {
      const response = await page.goto(`${baseURL}/ipfs/bafkqablimvwgy3y`, {
        waitUntil: 'networkidle'
      })

      // first loads the root page
      expect(response?.status()).toBe(200)

      const headers = await response?.allHeaders()
      expect(headers?.['content-type']).toContain('text/html')
      await page.waitForURL(`${protocol}//bafkqablimvwgy3y.ipfs.${host}/`, {
        timeout: 10_000
      })

      // wait for loading page to finish '.loading-page' to be removed
      await page.waitForSelector('.loading-page', { state: 'detached' })

      // and we verify the content was returned
      await page.waitForSelector('text=hello', {
        timeout: 25_000
      })
    })

    test('redirects to subdomain gateway with extra query params', async ({ page, baseURL, protocol, host }) => {
      const response = await page.goto(`${baseURL}/ipfs/bafkqablimvwgy3y?foo=bar`, {
        waitUntil: 'networkidle'
      })

      // first loads the root page
      expect(response?.status()).toBe(200)

      // wait for redirect
      await page.waitForSelector('text=hello', {
        timeout: 25_000
      })

      expect(page?.url()).toBe(`${protocol}//bafkqablimvwgy3y.ipfs.${host}/?foo=bar`)
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
  test.describe('subdomain-routing', () => {
    test.beforeAll(async () => {
      if (['webkit', 'safari'].includes(test.info().project.name)) {
        // @see https://github.com/ipfs/in-web-browsers/issues/206
        test.skip()
      }
    })

    test('requests to new pages are redirected', async ({ page, baseURL, protocol, host }) => {
      const cid = 'bafkqablimvwgy3y'
      const response = await page.goto(`${baseURL}/ipfs/${cid}`, {
        waitUntil: 'commit'
      })

      // first loads the root page
      expect(response?.status()).toBe(200)

      const headers = await response?.allHeaders()
      expect(headers?.['content-type']).toContain('text/html')

      // then we should be redirected to the IPFS path
      await expect(page).toHaveURL(`${protocol}//${cid}.ipfs.${host}`, {
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

    test('subdomain with url encoded path and params is redirected to root', async ({ page, baseURL, protocol, host }) => {
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

      const response = await page.goto(`${baseURL}/ipfs/${cid}/${encodeURIComponent(fileName)}?download=false`, {
        waitUntil: 'commit'
      })

      // first loads the root page
      expect(response?.status()).toBe(200)

      const headers = await response?.allHeaders()
      expect(headers?.['content-type']).toContain('text/html')

      // then we should be redirected to the IPFS path
      await expect(page).toHaveURL(`${protocol}//${cid}.ipfs.${host}/${encodeURIComponent(fileName)}?download=false`, {
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
