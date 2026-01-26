import { test, expect } from './fixtures/config-test-fixtures.ts'

/**
 * big buck bunny webm trimmed to 15 seconds with
 * `ffmpeg -i bigbuckbunny.webm -ss 00:00 -t 00:15 -c:a copy -c:v copy bigbuckbunny-mini.webm`
 */
const cid = 'bafybeie4vcqkutumw7s26ob2bwqwqi44m6lrssjmiirlhrzhs2akdqmkw4'

test.describe('video', () => {
  /**
   * We want to load the video fixture and ensure it starts playing.
   */
  test('starts playing automatically', async ({ page, baseURL }) => {
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
