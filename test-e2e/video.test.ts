import { test, expect } from './fixtures/config-test-fixtures.js'
import { setConfig } from './fixtures/set-sw-config.js'
import { waitForServiceWorker } from './fixtures/wait-for-service-worker'
import type { ConfigDbWithoutPrivateFields } from '../src/lib/config-db.js'

// const cid = 'bafybeie4vcqkutumw7s26ob2bwqwqi44m6lrssjmiirlhrzhs2akdqmkw4' // big buck bunny webm trimmed to 15 seconds with `ffmpeg -i bigbuckbunny.webm -ss 00:00 -t 00:15 -c:a copy -c:v copy bigbuckbunny-mini.webm`
const cid = 'bafkreicfnb5pizrilmrcuarbihfwdha6bz26veg526d7r2hwtz5qechvcy' // first CID when running `npx kubo@latest ls bafybeie4vcqkutumw7s26ob2bwqwqi44m6lrssjmiirlhrzhs2akdqmkw4`
test.describe('video', () => {
  const testConfig: Partial<ConfigDbWithoutPrivateFields> = {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    gateways: [process.env.KUBO_GATEWAY!],
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    routers: [process.env.KUBO_GATEWAY!],
    debug: '*,*:trace',
    enableWss: true,
    enableWebTransport: false,
    enableRecursiveGateways: true,
    enableGatewayProviders: false
  }

  /**
   * We want to load the video fixture and ensure it starts playing.
   */
  test('starts playing automatically', async ({ page, protocol, rootDomain }) => {
    await page.goto(`${protocol}//${rootDomain}`)
    await setConfig({ page, config: testConfig })
    await waitForServiceWorker(page)
    // let serviceWorkerConfigJson = await page.evaluate(async () => {
    //   const response = await fetch('/#/ipfs-sw-config-get')
    //   return response.json()
    // })
    // expect(serviceWorkerConfigJson).toMatchObject(testConfig)
    const response = await page.goto(`${protocol}//${rootDomain}/ipfs/${cid}`, { waitUntil: 'commit' })
    const start = performance.now()

    expect(response?.status()).toBe(200)
    await waitForServiceWorker(page)

    // sleep for a few seconds
    // await page.waitForTimeout(2000)

    // serviceWorkerConfigJson = await page.evaluate(async () => {
    //   const response = await fetch('/#/ipfs-sw-config-get')
    //   return response.json()
    // })
    // expect(serviceWorkerConfigJson).toMatchObject(testConfig)

    // expect a video player
    await page.waitForSelector('video')
    const video = await page.$('video')
    if (video == null) {
      throw new Error('video element not found')
    }

    // continuously check if the video is playing
    await page.waitForFunction((video) => {
      return video.currentTime > 0 && !video.paused && !video.ended && video.readyState > 2
    }, video)
    const end = performance.now()

    const timeToPlay = end - start
    expect(timeToPlay).toBeLessThan(10000)
  })
})
