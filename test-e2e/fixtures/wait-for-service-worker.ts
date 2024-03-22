import type { Page } from '@playwright/test'

export async function waitForServiceWorker (page: Page): Promise<void> {
  await page.evaluate(async () => {
    const registration = await window.navigator.serviceWorker.getRegistration()

    if (registration?.active?.state === 'activated') {
      return
    }

    await new Promise((resolve, reject) => {
      window.navigator.serviceWorker.addEventListener('controllerchange', resolve)
    })
  })
}
