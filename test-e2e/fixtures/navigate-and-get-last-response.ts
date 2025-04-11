import { waitForServiceWorker } from './wait-for-service-worker.js'
import type { Page, Response } from '@playwright/test'

/**
 * Navigates to a URL and returns the last response from the service worker.
 */
export async function navigateAndGetSwResponse (page: Page, { url, swScope }: { url: string, swScope: string }): Promise<Response> {
  const swScopeUrl = new URL(swScope)
  const lastSwResponsePromise = page.waitForResponse(response => {
    // if firefox is being used, .fromServiceWorker() will return false, so we need to check something else instead
    return response.url().includes(swScopeUrl.host) && response.headers()['ipfs-sw'] === 'true'
  })

  await page.goto(url)

  await waitForServiceWorker(page, swScope)

  return lastSwResponsePromise
}
