import { testPathRouting as test, expect } from './fixtures/config-test-fixtures.js'
import { setConfig } from './fixtures/set-sw-config.js'
import { waitForServiceWorker } from './fixtures/wait-for-service-worker'
import type { ConfigDbWithoutPrivateFields } from '../src/lib/config-db.js'

const cid = 'bafybeie4vcqkutumw7s26ob2bwqwqi44m6lrssjmiirlhrzhs2akdqmkw4' // big buck bunny webm trimmed to 15 seconds with `ffmpeg -i bigbuckbunny.webm -ss 00:00 -t 00:15 -c:a copy -c:v copy bigbuckbunny-mini.webm`

test.describe('video', () => {
  test.beforeEach(async ({ page }) => {
    // we need to send a request to the service worker to accept the origin isolation warning
    await page.evaluate(async () => {
      const response = await fetch('?ipfs-sw-accept-origin-isolation-warning=true')
      if (!response.ok) {
        throw new Error('Failed to accept origin isolation warning')
      }
    })
  })

  const testConfig: Partial<ConfigDbWithoutPrivateFields> = {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    gateways: [process.env.KUBO_GATEWAY!],
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    routers: [process.env.KUBO_GATEWAY!],
    debug: '*,*:trace',
    enableWss: true,
    enableWebTransport: false,
    enableRecursiveGateways: true,
    enableGatewayProviders: true
  }

  /**
   * We want to load the video fixture and ensure it starts playing.
   */
  test('starts playing automatically', async ({ page }) => {
    await setConfig({ page, config: testConfig })
    await waitForServiceWorker(page, 'http://127.0.0.1:3333')
    const response = await page.goto(`http://127.0.0.1:3333/ipfs/${cid}`, { waitUntil: 'commit' })
    const start = performance.now()

    expect(response?.status()).toBe(200)
    await waitForServiceWorker(page, 'http://127.0.0.1:3333')

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
