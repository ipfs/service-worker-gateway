import { test, expect } from './fixtures/config-test-fixtures.ts'
import { getHeader, getHeaderTitle } from './fixtures/locators.ts'

test.describe('smoketests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', {
      waitUntil: 'networkidle'
    })
  })

  test.describe('landing page', () => {
    test('header visibility', async ({ page }) => {
      await expect(getHeader(page)).toBeVisible()
      const title = getHeaderTitle(page)
      await expect(title).toBeVisible()
      await expect(title).toHaveText(/.*Service Worker Gateway.*/)
    })
  })
})
