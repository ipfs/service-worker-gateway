import type { Page } from '@playwright/test'

export async function waitForServiceWorker (page: Page): Promise<void> {
  await page.evaluate(async () => {
    const iterations = 1000
    const delay = 1_000

    for (let i = 0; i < iterations; i++) {
      const registration = await window.navigator.serviceWorker.getRegistration()

      if (registration?.active?.state === 'activated') {
        return
      }

      await new Promise<void>(resolve => {
        setTimeout(() => {
          resolve()
        }, delay)
      })
    }

    throw new Error(`SW failed to register after ${iterations * delay}ms`)
  })
}
