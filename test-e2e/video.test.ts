import { type ConfigDbWithoutPrivateFields } from '../src/lib/config-db.js'
import { testPathRouting as test, expect } from './fixtures/config-test-fixtures.js'
import { getConfig, setConfig } from './fixtures/set-sw-config.js'
// import { waitForServiceWorker } from './fixtures/wait-for-service-worker.js'

// const cid = 'bafkreifxwh3i3e7etigob52wqjiic2skhka6nblhmkxtodqpw55tekjg5a' // blank video, mpg
// const cid = 'bafkreibux244hbfyljy4ato265ugpqle6rakmpw24disegfe7rjt442ele' // blank video, webm
// const cid = 'bafybeiao6bob2xmjxjw74bzkcpw4txuoa4uhyu4ikgiyrvr2uwykmfukgi' // beach.mp4
// const cid = 'bafybeih6fyvqpookcgm2vfiapxsvaj2pibf5oflssph7zwn5qn57mfiikm' // beach.webm downloaded from https://www.pexels.com/video/drone-footage-of-the-beach-8150514/ and converted to webm (playwright wont render mp4 for some reason)
const cid = 'bafybeiaelnma6kc5k2522f3277m4iw72l4kqbblnxmmoyjugjsaxcpeu7i' // beach2.webm downloaded from https://www.pexels.com/video/scenic-view-of-a-beach-1893629/ and converted to webm (playwright wont render mp4 for some reason)
// const cid = 'bafybeidsp6fva53dexzjycntiucts57ftecajcn5omzfgjx57pqfy3kwbq' // big buck bunny
test.describe('video', () => {
  const testConfig: Partial<ConfigDbWithoutPrivateFields> = {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    gateways: [process.env.KUBO_GATEWAY!],
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    routers: [process.env.KUBO_GATEWAY!],
    debug: 'helia*,helia*:trace,libp2p*,libp2p*:trace',
    enableWss: true,
    enableWebTransport: false,
    enableRecursiveGateways: true,
    enableGatewayProviders: false
  }

  /**
   * We want to load the beach video fixture and ensure it starts playing.
   */
  test('time to play video is reasonable', async ({ page }) => {
    // eslint-disable-next-line no-console
    console.log('process.env.KUBO_GATEWAY', process.env.KUBO_GATEWAY)
    await setConfig({ page, config: testConfig })

    page.on('request', async (request) => {
      // eslint-disable-next-line no-console
      console.log('request.url()', request.url(), await request.allHeaders())
    })

    page.on('response', async (response) => {
      // eslint-disable-next-line no-console
      console.log('response.url()', response.url(), await response.allHeaders())
    })
    const response = await page.goto(`http://127.0.0.1:3333/ipfs/${cid}`, { waitUntil: 'commit' })
    // const response = await page.goto(`${process.env.KUBO_GATEWAY}/ipfs/${cid}`) // test with kubo gateway directly.
    // subdomains
    // const response = await page.goto(`${protocol}//${cid}.ipfs.${rootDomain}`, { waitUntil: 'commit' })

    // await waitForServiceWorker(page)
    const start = performance.now()

    const config = await getConfig({ page })
    // eslint-disable-next-line no-console
    console.log('config', config)

    expect(response?.status()).toBe(200)

    // expect a video player
    await page.waitForSelector('video')
    const video = await page.$('video')
    if (video == null) {
      throw new Error('video element not found')
    }

    // make sure the video is actually playing
    // continuously check if the video is playing
    await page.waitForFunction((video) => {
      return video.currentTime > 0 && !video.paused && !video.ended && video.readyState > 2
    }, video)
    const end = performance.now()

    const timeToPlay = end - start
    expect(timeToPlay).toBeLessThan(1000)
  })
})

/**
- **tmp**
- **test: add test for big-buck-bunny ttfb**

## Title

<!---
The title of the PR will be the commit message of the merge commit, so please make sure it is descriptive enough.
We utilize the Conventional Commits specification for our commit messages. See <https://www.conventionalcommits.org/en/v1.0.0/#specification> for more information.
The commit tag types can be of one of the following: feat, fix, deps, refactor, chore, docs. See <https://github.com/ipfs/helia/blob/main/.github/workflows/main.yml#L184-L192>
The title must also be fewer than 72 characters long or it will fail the Semantic PR check. See <https://github.com/ipfs/helia/blob/main/.github/workflows/semantic-pull-request.yml>
--->
test: local-only ttfb for big-buck-bunny

## Description

<!--
Please write a summary of your changes and why you made them.
Please include any relevant issues in here, for example:
Related https://github.com/ipfs/helia/issues/ABCD.
Fixes https://github.com/ipfs/helia/issues/XYZ.
-->

A test to help confirm improved performance for https://github.com/ipfs/helia-verified-fetch/pull/163

## Notes & open questions

<!--
Any notes, remarks or open questions you have to make about the PR which don't need to go into the final commit message.
-->

### Running against main:

```console
> npm i --save @helia/verified-fetch@latest && npm run test:chrome -- -g 'ttfb' --workers=1 --repeat-each=10

# ...

Running 10 tests using 1 worker

  ✓  1 [chromium] › ttfb-big-buck-bunny.test.ts:29:3 › ttfb-time-to-play-video › loads quickly (1.9s)
[WebServer] (node:53174) [DEP0066] DeprecationWarning: OutgoingMessage.prototype._headers is deprecated
[WebServer] (Use `node --trace-deprecation ...` to show where the warning was created)
  ✓  2 [chromium] › ttfb-big-buck-bunny.test.ts:29:3 › ttfb-time-to-play-video › loads quickly (2.0s)
  ✓  3 [chromium] › ttfb-big-buck-bunny.test.ts:29:3 › ttfb-time-to-play-video › loads quickly (2.0s)
  ✓  4 [chromium] › ttfb-big-buck-bunny.test.ts:29:3 › ttfb-time-to-play-video › loads quickly (2.1s)
  ✓  5 [chromium] › ttfb-big-buck-bunny.test.ts:29:3 › ttfb-time-to-play-video › loads quickly (1.8s)
  ✓  6 [chromium] › ttfb-big-buck-bunny.test.ts:29:3 › ttfb-time-to-play-video › loads quickly (2.5s)
  ✓  7 [chromium] › ttfb-big-buck-bunny.test.ts:29:3 › ttfb-time-to-play-video › loads quickly (2.3s)
  ✓  8 [chromium] › ttfb-big-buck-bunny.test.ts:29:3 › ttfb-time-to-play-video › loads quickly (2.2s)
  ✓  9 [chromium] › ttfb-big-buck-bunny.test.ts:29:3 › ttfb-time-to-play-video › loads quickly (2.3s)
  ✓  10 [chromium] › ttfb-big-buck-bunny.test.ts:29:3 › ttfb-time-to-play-video › loads quickly (2.3s)

  10 passed (52.3s)
```

### Running with verified-fetch from https://github.com/ipfs/helia-verified-fetch/pull/163

```console
> npm i --save /Users/sgtpooki/code/work/protocol.ai/ipfs/helia-verified-fetch/packages/verified-fetch/helia-verified-fetch-2.3.0.tgz && npm run test:chrome -- -g 'ttfb' --workers=1 --repeat-each=10

# ...

Running 10 tests using 1 worker

  ✓  1 [chromium] › ttfb-big-buck-bunny.test.ts:29:3 › ttfb-time-to-play-video › loads quickly (2.5s)
[WebServer] (node:54928) [DEP0066] DeprecationWarning: OutgoingMessage.prototype._headers is deprecated
[WebServer] (Use `node --trace-deprecation ...` to show where the warning was created)
  ✓  2 [chromium] › ttfb-big-buck-bunny.test.ts:29:3 › ttfb-time-to-play-video › loads quickly (2.0s)
  ✓  3 [chromium] › ttfb-big-buck-bunny.test.ts:29:3 › ttfb-time-to-play-video › loads quickly (2.6s)
  ✓  4 [chromium] › ttfb-big-buck-bunny.test.ts:29:3 › ttfb-time-to-play-video › loads quickly (2.3s)
  ✓  5 [chromium] › ttfb-big-buck-bunny.test.ts:29:3 › ttfb-time-to-play-video › loads quickly (1.8s)
  ✓  6 [chromium] › ttfb-big-buck-bunny.test.ts:29:3 › ttfb-time-to-play-video › loads quickly (2.2s)
  ✓  7 [chromium] › ttfb-big-buck-bunny.test.ts:29:3 › ttfb-time-to-play-video › loads quickly (2.1s)
  ✓  8 [chromium] › ttfb-big-buck-bunny.test.ts:29:3 › ttfb-time-to-play-video › loads quickly (2.1s)
  ✓  9 [chromium] › ttfb-big-buck-bunny.test.ts:29:3 › ttfb-time-to-play-video › loads quickly (1.5s)
  ✓  10 [chromium] › ttfb-big-buck-bunny.test.ts:29:3 › ttfb-time-to-play-video › loads quickly (1.7s)

  10 passed (54.3s)
```

## Change checklist

- [ ] I have performed a self-review of my own code
- [ ] I have made corresponding changes to the documentation if necessary (this includes comments as well)
- [ ] I have added tests that prove my fix is effective or that my feature works

 */
