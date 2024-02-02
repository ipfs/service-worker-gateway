import { test, expect } from '@playwright/test'
import { playwright } from 'test-util-ipfs-example'

// Setup
const play = test.extend({
  ...playwright.servers()
})

play.describe('bundle Helia with Webpack:', () => {
  // DOM
  const $inputEl = '#inputContent'
  const submitBtn = '#load-in-page'
  const output = '#text-content'

  play.beforeEach(async ({ servers, page }) => {
    await page.goto(`http://localhost:${servers[0].port}/`)
  })

  // currently broken, probably because of service worker loading in playwright?
  play.skip('should properly initialized a Helia node and add/get a file', async ({ page }) => {
    const input = '/ipfs/bafybeifx7yeb55armcsxwwitkymga5xf53dxiarykms3ygqic223w5sk3m'
    const expectedResult = 'Hello from IPFS Gateway Checker'

    await page.fill($inputEl, input)
    await page.click(submitBtn)

    await page.waitForSelector(output)
    const outputContent = await page.textContent(output)

    expect(outputContent).toContain(expectedResult)
  })
})
