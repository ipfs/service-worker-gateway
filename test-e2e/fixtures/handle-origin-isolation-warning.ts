import { expect } from './config-test-fixtures.js'
import type { Page } from '@playwright/test'

export async function handleOriginIsolationWarning (page: Page): Promise<void> {
  await expect(page.locator('.e2e-subdomain-warning')).toBeVisible()

  // now click the button to accept the warning
  await page.click('.e2e-subdomain-warning button')

  await expect(page.locator('.e2e-subdomain-warning')).not.toBeVisible({
    timeout: 10_000
  })
}
