import delay from 'delay'
import { test, expect } from './fixtures/config-test-fixtures.ts'
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
})
