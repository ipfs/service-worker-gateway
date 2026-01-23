import { test, expect } from './fixtures/config-test-fixtures.ts'
import { findIpAddress } from './fixtures/find-ip-address.ts'
import { loadWithServiceWorker } from './fixtures/load-with-service-worker.ts'

test.describe('error pages', () => {
  test('it should show a message for unsupported hash algorithms', async ({ page, baseURL }) => {
    // uses un-configured dbl-sha2-256 algorithm
    const cid = 'bahaacvrabdhd3fzrwaambazyivoiustl2bo2c3rgweo2ug4rogcoz2apaqaa'

    const response = await loadWithServiceWorker(page, `${baseURL}/ipfs/${cid}`)

    expect(response.status()).toBe(500)
    expect(await response.text()).toContain('UnknownHashAlgorithmError')
  })

  test('it should show a message when accessing the service worker via an IP address', async ({ browser, protocol, port }) => {
    const ip = findIpAddress()

    if (ip == null) {
      test.skip()
      return
    }

    const testUrl = `${protocol}//${ip}:${port}/ipfs/bafkqablimvwgy3y`
    const context = await browser.newContext()
    const page = await context.newPage()

    await page.goto(testUrl, {
      waitUntil: 'networkidle'
    })

    expect(await page.$('.e2e-no-service-worker-error')).toBeTruthy()
  })
})
