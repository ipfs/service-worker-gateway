import { waitForServiceWorker } from './wait-for-service-worker.js'
import type { Page, Response } from '@playwright/test'

export async function navigateAndGetSwResponse (page: Page, { url, swScope }: { url: string, swScope: string }): Promise<Response> {
  await page.goto(url)

  await waitForServiceWorker(page, swScope)

  const swScopeUrl = new URL(swScope)

  const lastSwResponse = await page.waitForResponse(response => {
    return response.url().includes(swScopeUrl.host) && response.headers()['x-ipfs-path'] != null && response.fromServiceWorker()
  })

  return lastSwResponse
}
