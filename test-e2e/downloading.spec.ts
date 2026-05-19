import delay from 'delay'
import { CID } from 'multiformats/cid'
import { test, expect } from './fixtures/config-test-fixtures.ts'
import { publishDNSLink } from './fixtures/serve/dns-record-cache.ts'
import type { Download } from 'playwright'

test.describe('downloading page', () => {
  let download: Download

  test.afterEach(async () => {
    try {
      await download?.delete()
    } catch {
      // this can throw if the page has already closed
    }
  })

  test('should show a message after download', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download')

    await page.fill('#inputContent', '/ipfs/bafkqaddimvwgy3zao5xxe3debi')
    await page.click('#show-advanced')
    await page.selectOption('#download', 'true')
    await page.click('#load-directly')

    download = await downloadPromise

    await delay(2_000)

    const text = await page.textContent('body')
    expect(text).toContain('Your download should begin shortly')
  })

  test('should allow retrying', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download')

    await page.fill('#inputContent', '/ipfs/bafkqaddimvwgy3zao5xxe3debi')
    await page.click('#show-advanced')
    await page.selectOption('#download', 'true')
    await page.click('#load-directly')

    download = await downloadPromise

    await delay(2_000)

    const text = await page.textContent('body')
    expect(text).toContain('Retry')
  })

  test('should allow checking availability', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download')

    await page.fill('#inputContent', '/ipfs/bafkqaddimvwgy3zao5xxe3debi')
    await page.click('#show-advanced')
    await page.selectOption('#download', 'true')
    await page.click('#load-directly')

    download = await downloadPromise

    await delay(2_000)

    const text = await page.textContent('body')
    expect(text).toContain('Check CID availability')
  })

  test('should not allow checking availability for IPNS', async ({ page }) => {
    const domain = 'ipns-download-form.com'
    const cid = CID.parse('bafkqaddimvwgy3zao5xxe3debi')

    await publishDNSLink(domain, cid)

    const downloadPromise = page.waitForEvent('download')

    await page.fill('#inputContent', `/ipns/${domain}`)
    await page.click('#show-advanced')
    await page.selectOption('#download', 'true')
    await page.click('#load-directly')

    download = await downloadPromise

    await delay(2_000)

    const text = await page.textContent('body')
    expect(text).toContain('Retry')
    expect(text).not.toContain('Check CID availability')
  })
})
