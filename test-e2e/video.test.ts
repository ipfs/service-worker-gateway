import { testPathRouting as test, expect } from './fixtures/config-test-fixtures.js'
import { setConfig } from './fixtures/set-sw-config.js'
import { waitForServiceWorker } from './fixtures/wait-for-service-worker'
import type { ConfigDbWithoutPrivateFields } from '../src/lib/config-db.js'

const cid = 'bafybeie4vcqkutumw7s26ob2bwqwqi44m6lrssjmiirlhrzhs2akdqmkw4' // big buck bunny webm trimmed to 15 seconds with `ffmpeg -i bigbuckbunny.webm -ss 00:00 -t 00:15 -c:a copy -c:v copy bigbuckbunny-mini.webm`
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
   * We want to load the beach video fixture and ensure it starts playing.
   */
  test('time to play video is reasonable', async ({ page, protocol, rootDomain }) => {
    await page.goto(`${protocol}//${rootDomain}`)
    await setConfig({ page, config: testConfig })
    await waitForServiceWorker(page)
    const response = await page.goto(`${protocol}//${rootDomain}/ipfs/${cid}`, { waitUntil: 'commit' })
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
