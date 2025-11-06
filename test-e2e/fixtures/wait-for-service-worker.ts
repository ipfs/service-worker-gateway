import type { Page } from '@playwright/test'

export async function waitForServiceWorker (page: Page, scope: string): Promise<void> {
  await page.evaluate(async ({ scope }: { scope: string }) => {
    const iterations = 10
    const delay = 1_000

    if (typeof scope !== 'string' || scope.trim() === '') {
      throw new Error('The "scope" parameter is mandatory and must be a non-empty string.')
    }

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
  }, { scope })
}
