import { handleOriginIsolationWarning } from './fixtures/handle-origin-isolation-warning.js'
import type { Page } from 'playwright'

export async function allowInsecureWebsiteAccess (page: Page): Promise<void> {
  await page.goto('http://127.0.0.1:3333/ipfs/bafkqablimvwgy3y', {
    waitUntil: 'commit'
  })

  await handleOriginIsolationWarning(page)
}
