import { test, expect } from './fixtures/config-test-fixtures.js'
import { swScopeVerification } from './fixtures/sw-scope-verification.js'
import { waitForServiceWorker } from './fixtures/wait-for-service-worker.js'

test.describe('service worker registration', () => {
  test('activates successfully on fresh registration', async ({ page, baseURL }) => {
    // Unregister any existing service worker
    await page.goto(baseURL ?? 'http://localhost:3333')
    await page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map(r => r.unregister()))
    })

    // Navigate to trigger fresh registration
    await page.goto(baseURL ?? 'http://localhost:3333')

    // Wait for SW to activate
    await waitForServiceWorker(page)

    // Verify SW is properly registered
    await swScopeVerification(page, expect)
  })

  test('re-registers after being unregistered', async ({ page, baseURL }) => {
    // First ensure SW is registered
    await page.goto(baseURL ?? 'http://localhost:3333')
    await waitForServiceWorker(page)

    // Unregister SW
    await page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map(r => r.unregister()))
    })

    // Verify SW is unregistered
    const hasNoRegistration = await page.evaluate(async () => {
      return await navigator.serviceWorker.getRegistration() === undefined
    })
    expect(hasNoRegistration).toBe(true)

    // Navigate to root to trigger re-registration (avoid IPFS path which causes redirects)
    await page.goto(baseURL ?? 'http://localhost:3333', { waitUntil: 'networkidle' })

    // Wait for SW to activate again
    await waitForServiceWorker(page)

    // Verify SW is properly registered
    await swScopeVerification(page, expect)
  })

  test('handles multiple register/unregister cycles', async ({ page, baseURL }) => {
    for (let i = 0; i < 3; i++) {
      // Navigate and wait for SW
      await page.goto(baseURL ?? 'http://localhost:3333')
      await waitForServiceWorker(page)

      // Verify SW is registered
      await swScopeVerification(page, expect)

      // Unregister
      await page.evaluate(async () => {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registrations.map(r => r.unregister()))
      })

      // Verify unregistered
      const hasNoRegistration = await page.evaluate(async () => {
        return await navigator.serviceWorker.getRegistration() === undefined
      })
      expect(hasNoRegistration).toBe(true)
    }
  })

  // NOTE: Testing the activation timeout error page is not possible in E2E because
  // Playwright cannot intercept service worker script fetches:
  // "Requests for updated Service Worker main script code currently cannot be routed"
  // @see https://playwright.dev/docs/service-workers
  //
  // The timeout functionality is tested implicitly - if waitForActivation hangs
  // indefinitely, the tests above would fail.
})
