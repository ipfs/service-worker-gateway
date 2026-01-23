import { test, expect } from './fixtures/config-test-fixtures.ts'
import { setConfig } from './fixtures/set-sw-config.ts'
import { waitForServiceWorker } from './fixtures/wait-for-service-worker.ts'
import type { ConfigDb } from '../src/lib/config-db.ts'

const cid = 'bafybeie4vcqkutumw7s26ob2bwqwqi44m6lrssjmiirlhrzhs2akdqmkw4' // big buck bunny webm trimmed to 15 seconds with `ffmpeg -i bigbuckbunny.webm -ss 00:00 -t 00:15 -c:a copy -c:v copy bigbuckbunny-mini.webm`

test.describe('video', () => {
  test.beforeEach(async ({ page }) => {
    await waitForServiceWorker(page)
  })

  const testConfig: Partial<ConfigDb> = {
    gateways: [process.env.KUBO_GATEWAY!],
    routers: [process.env.KUBO_GATEWAY!],
    enableWss: true,
    enableWebTransport: false,
    enableRecursiveGateways: true,
    enableGatewayProviders: true
  }

  /**
   * We want to load the video fixture and ensure it starts playing.
   */
  test('starts playing automatically', async ({ page, baseURL }) => {
    await setConfig(page, testConfig)
    await waitForServiceWorker(page)
    const response = await page.goto(`${baseURL}/ipfs/${cid}`, {
      waitUntil: test.info().project.name === 'firefox' ? 'networkidle' : 'commit'
    })
    const start = performance.now()

    expect(response?.status()).toBe(200)

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
