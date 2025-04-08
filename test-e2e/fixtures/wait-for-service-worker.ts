import type { Page } from '@playwright/test'

export async function waitForServiceWorker (page: Page, scope?: string): Promise<void> {
  await page.waitForFunction(async ({ scope }: { scope?: string }) => {
    const registration = await window.navigator.serviceWorker.getRegistration()

    if (registration?.active?.state === 'activated') {
      if (scope != null) {
        // expectedScope is provided, so we need to check if the scope is as expected
        return registration?.scope === scope
      } else {
        // no expectedScope, so we just need to check if the service worker is activated
        return true
      }
    }
  }, { scope })
}
