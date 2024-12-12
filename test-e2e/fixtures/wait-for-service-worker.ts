import type { Page } from '@playwright/test'

export async function waitForServiceWorker (page: Page): Promise<void> {
  await page.waitForFunction(async () => {
    const registration = await window.navigator.serviceWorker.getRegistration()

    if (registration?.active?.state === 'activated') {
      return true
    }
  })
}
