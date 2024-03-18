import { test, expect } from '@playwright/test'

test.describe('byte-ranges', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
  })
  test('should be able to get a single character', async ({ page }) => {
    // wait for service worker to load
    await page.evaluate(async () => {
      const registration = await window.navigator.serviceWorker.getRegistration()

      if (registration?.active?.state === 'activated') {
        return
      }

      await new Promise((resolve, reject) => {
        window.navigator.serviceWorker.addEventListener('controllerchange', resolve)
      })
    })
    const partialText = await page.evaluate(async () => {
      const response = await fetch('/ipfs/bafkqaddimvwgy3zao5xxe3debi', { headers: { range: 'bytes=1-2' } })
      const text = await response.text()
      return text
    })

    if (partialText == null) throw new Error('missing response')

    expect(partialText).toBe('el')
  })
})
