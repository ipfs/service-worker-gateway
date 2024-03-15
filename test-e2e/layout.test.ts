/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { test, expect, type Page, type Locator } from '@playwright/test'

interface GetLocator {
  (page: Page): Locator
}
const getHeader: GetLocator = (page) => page.locator('.e2e-header')
const getHeaderTitle: GetLocator = (page) => page.locator('.e2e-header-title')
const getConfigButton: GetLocator = (page) => page.locator('.e2e-header-config-button')
const getConfigPage: GetLocator = (page) => page.locator('.e2e-config-page')
const getConfigPageInput: GetLocator = (page) => page.locator('.e2e-config-page-input')
const getConfigPageButton: GetLocator = (page) => page.locator('.e2e-config-page-button')

test.describe('smoketests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000')
  })

  test.describe('landing page', () => {
    test('header visibility', async ({ page }) => {
      await expect(getHeader(page)).toBeVisible()
      const title = getHeaderTitle(page)
      await expect(title).toBeVisible()
      await expect(title).toHaveText('IPFS Service Worker Gateway')
      await expect(getConfigButton(page)).toBeVisible()
    })
  })

  test.describe('config page', () => {
    test('opens when clicked', async ({ page }) => {
      const configPage = getConfigPage(page)
      await expect(configPage).not.toBeVisible()
      await getConfigButton(page).click()
      await expect(configPage).toBeVisible()
    })

    test('has multiple inputs and submit button', async ({ page }) => {
      const configPage = getConfigPage(page)
      await getConfigButton(page).click()
      await expect(configPage).toBeVisible()
      const inputLocator = getConfigPageInput(page)
      // see https://playwright.dev/docs/locators#strictness
      await inputLocator.first().waitFor()
      expect(await inputLocator.count()).toEqual(4)
      const submitButton = getConfigPageButton(page)
      await expect(submitButton).toBeVisible()
    })
  })
})
