import type { Page } from '@playwright/test'

export async function waitForServiceWorker (page: Page, scope: string): Promise<void> {
  await page.waitForFunction(async ({ scope }: { scope: string }) => {
    if (typeof scope !== 'string' || scope.trim() === '') {
      throw new Error('The "scope" parameter is mandatory and must be a non-empty string.')
    }
    const registration = await window.navigator.serviceWorker.getRegistration()

    if (registration?.active?.state === 'activated') {
      return registration?.scope === scope
    }
  }, { scope })
}
