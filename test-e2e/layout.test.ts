import { HASH_FRAGMENTS } from '../src/lib/constants.js'
import { test, expect, testSubdomainRouting } from './fixtures/config-test-fixtures.js'
import { getConfigPage, getConfigPageSaveButton, getConfigPageInput, getHeader, getHeaderTitle, getHelperUi, getAboutSection } from './fixtures/locators.js'
import { waitForServiceWorker } from './fixtures/wait-for-service-worker.js'

test.describe('smoketests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test.describe('landing page', () => {
    test('header visibility', async ({ page }) => {
      await expect(getHeader(page)).toBeVisible()
      const title = getHeaderTitle(page)
      await expect(title).toBeVisible()
      await expect(title).toHaveText(/.*Service Worker Gateway.*/)
    })
  })

  test.describe('config section', () => {
    test('displays on config page', async ({ page, baseURL }) => {
      await page.goto(`${baseURL}/#${HASH_FRAGMENTS.IPFS_SW_CONFIG_UI}`, {
        waitUntil: 'networkidle'
      })

      const configPage = getConfigPage(page)
      await expect(configPage).toBeVisible()
    })

    test('has multiple inputs and submit button', async ({ page, baseURL }) => {
      await page.goto(`${baseURL}/#${HASH_FRAGMENTS.IPFS_SW_CONFIG_UI}`, {
        waitUntil: 'networkidle'
      })

      const configPage = getConfigPage(page)
      await expect(configPage).toBeVisible()
      const inputLocator = getConfigPageInput(page)
      // see https://playwright.dev/docs/locators#strictness
      await inputLocator.first().waitFor()
      expect(await inputLocator.count()).toEqual(11)
      const submitButton = getConfigPageSaveButton(page)
      await expect(submitButton).toBeVisible()
    })
  })
})

testSubdomainRouting.describe('smoketests', () => {
  testSubdomainRouting.describe('config section on subdomains', () => {
    // TODO: remove this test because we don't want to support config page on subdomains. See
    testSubdomainRouting(`only config and header are visible on /#/${HASH_FRAGMENTS.IPFS_SW_CONFIG_UI} requests`, async ({ page, baseURL, rootDomain, protocol, browserName }) => {
      testSubdomainRouting.skip(browserName === 'firefox', 'Playwright doesn\'t treat hard refreshes correctly in Firefox.')

      await page.goto(baseURL, {
        waitUntil: 'networkidle'
      })
      await waitForServiceWorker(page)
      await page.goto(`${protocol}//bafkqablimvwgy3y.ipfs.${rootDomain}/#/${HASH_FRAGMENTS.IPFS_SW_CONFIG_UI}`, {
        waitUntil: 'networkidle'
      })
      await page.reload()

      await waitForServiceWorker(page)

      const configPage = getConfigPage(page)
      await expect(configPage).toBeVisible()

      // ensure header is visible
      const header = getHeader(page)
      await expect(header).toBeVisible()

      // ensure helper ui section is not visible
      const helperUi = getHelperUi(page)
      await expect(helperUi).toBeHidden()

      // ensure about section is not visible
      const aboutSection = getAboutSection(page)
      await expect(aboutSection).toBeHidden()
    })
  })
})
