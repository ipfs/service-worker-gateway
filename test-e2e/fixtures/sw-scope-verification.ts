import type { Expect, Page } from '@playwright/test'

/**
 * Verifies that the service worker is registered to the root scope of whatever
 * page we're on.
 *
 * This is important for ensuring that the service worker is properly scoped and
 * does not conflict with other service workers on the same domain.
 */
export async function swScopeVerification (page: Page, expect: Expect): Promise<void> {
  // expect service worker that is registered to the root scope
  const sw = await page.evaluate(async () => {
    const registrations = await navigator.serviceWorker.getRegistrations()
    return registrations.map((r) => ({
      scope: r.scope,
      active: r.active,
      waiting: r.waiting,
      installing: r.installing
    }))
  })
  expect(sw).toBeDefined()
  expect(sw?.length).toBe(1)

  // get the url with path=/ to determine the expected root scope
  const url = new URL(page.url())
  expect(sw?.[0].scope).toBe(`${url.protocol}//${url.host}/`)
}
