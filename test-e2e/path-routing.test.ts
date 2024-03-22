import { test, expect } from '@playwright/test'
import { waitForServiceWorker } from './fixtures/wait-for-service-worker.js'

test.describe('path-routing', () => {
  test('can load identity CID via path', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle' })
    // wait for service worker to load
    await waitForServiceWorker(page)
    await page.goto('http://127.0.0.1:3000/ipfs/bafkqablimvwgy3y', { waitUntil: 'networkidle' })

    // expect page content to contain 'hello'
    const text = await page.textContent('body')
    expect(text).toContain('hello')
  })
})
