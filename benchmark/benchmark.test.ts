/* eslint-disable max-nested-callbacks,no-console */

import { test, expect } from '@playwright/test'
import { loadWithServiceWorker } from '../test-e2e/fixtures/load-with-service-worker.ts'

test.describe.configure({ mode: 'serial' })

const REPEAT = 10
const CID = 'bafybeigocr7lc57bjw3b7jkv2y3mtggcvfiebs5wq5b7epfwtb5wgwgzm4'

test.describe('@helia/service-worker-gateway - benchmark', () => {
  const tests = [{
    name: 'inbrowser.link (subdomain gateway)',
    url: (cid: string): string => `https://${cid}.ipfs.inbrowser.link/`
  }, {
    name: 'inbrowser.link (path gateway)',
    url: (cid: string): string => `https://inbrowser.link/ipfs/${cid}/`
  }, {
    name: 'inbrowser.dev (subdomain gateway)',
    url: (cid: string): string => `https://${cid}.ipfs.inbrowser.dev/`
  }, {
    name: 'inbrowser.dev (path gateway)',
    url: (cid: string): string => `https://inbrowser.dev/ipfs/${cid}/`
  }]

  tests.forEach(t => {
    test(`${t.name}`, async ({ browser }) => {
      // this test takes some time to run
      test.setTimeout(640_000_000)

      let time = 0

      for (let i = 0; i < REPEAT; i++) {
        const context = await browser.newContext()

        // should not have any service workers installed
        expect(context.serviceWorkers().length).toBe(0)

        const page = await context.newPage()

        // start recording
        const start = Date.now()
        const response = await loadWithServiceWorker(page, t.url(CID), {
          // 'commit' means the response headers have been received and the page
          // is starting to load
          waitUntil: 'commit'
        })
        time += (Date.now() - start)
        process.stdout.write('.')

        // check response
        expect(response.status()).toBe(200)
        expect(response.headers()['content-length']).toBe('8895')
        expect(response.headers()['content-type']).toBe('image/jpeg')

        // should have service worker(s)
        expect(context.serviceWorkers().length).not.toBe(0)

        await context.close()
      }

      process.stdout.write('\n')
      console.info(t.name, Math.round(time / REPEAT), 'ms')
    })
  })
})
