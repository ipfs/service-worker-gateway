import { chromium } from '@playwright/test'

/**
 * TODO: we may want to set up a kubo daemon for testing fetching of content
 * see https://github.com/ipfs/ipfs-webui/blob/main/test/e2e/setup/global-setup.js for inspiration
 *
 * @param {import('@playwright/test').Config} config
 */
const globalSetup = async (config) => {
  const baseURL = 'http://localhost:3000'
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto(baseURL)
  await browser.close()
}

export default globalSetup
