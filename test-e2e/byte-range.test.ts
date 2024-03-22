import { test, expect } from '@playwright/test'
import { waitForServiceWorker } from './fixtures/wait-for-service-worker.js'

test.describe('byte-ranges', () => {
  test('should be able to get a single character', async ({ page }) => {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    // wait for service worker to load
    await waitForServiceWorker(page)

    const partialText = await page.evaluate(async () => {
      const response = await fetch('/ipfs/bafkqaddimvwgy3zao5xxe3debi', { headers: { range: 'bytes=1-2' } })
      const text = await response.text()
      return text
    })

    if (partialText == null) throw new Error('missing response')

    expect(partialText).toBe('el')
  })
})
