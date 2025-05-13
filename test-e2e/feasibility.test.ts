/**
 * Test requests that we get from the ipfs gateway in the service worker gateway.
 *
 * You should start up a kubo node separate from this test and run:
 *
 * ```
 * npm run build && GATEWAY_PORT=8080 REQUESTS_FILE=/Users/sgtpooki/Downloads/requests-2025-05-07-filtered.json KUBO_RUNNING=true START_INDEX=0 TEST_COUNT=50 npm run test:chrome -- -g 'feasibility' --retries 0 --max-failures 999
 * ```
 */

import { on } from 'node:events'
import { createReadStream, constants } from 'node:fs'
import { access, rm } from 'node:fs/promises'
import { createInterface } from 'node:readline'
import { $ } from 'execa'
import { testSubdomainRouting as test, expect } from './fixtures/config-test-fixtures.js'
// import { test, expect } from './fixtures/config-test-fixtures.js'
import { gatewayPort } from './fixtures/create-kubo-node.js'
import { setConfig } from './fixtures/set-sw-config.js'
import { waitForServiceWorker } from './fixtures/wait-for-service-worker.js'

// const usingOutsideKubo = gatewayPort !== 8088
/**
 * Some file containing newline-delimited json objects that look like `{"ClientRequestURI":"/ipfs/QmeuBb8H6x7yPjpv6DDKDQa4JDiT3tCncsnmRAGd39NWxm","ClientRequestUserAgent":"Go-http-client/2.0","EdgeResponseStatus":"200","EdgeResponseContentType":"application/json","EdgeResponseBytes":"1529","cnt":"6527"}`
 */
const givenPathToRequestJson = process.env.REQUESTS_FILE != null && process.env.REQUESTS_FILE !== '' ? process.env.REQUESTS_FILE : null
// const describe = usingOutsideKubo && givenPathToRequestJson != null ? test.describe : test.describe.skip
const describe = givenPathToRequestJson != null ? test.describe : test.describe.skip

const tests: RequestDetails[] = []
if (givenPathToRequestJson != null) {
// if (usingOutsideKubo && givenPathToRequestJson != null) {
  process.env.KUBO_GATEWAY = `http://localhost:${gatewayPort}`
  const rl = createInterface({ input: createReadStream(givenPathToRequestJson), crlfDelay: Infinity })
  const testsToRun = await getTests(rl)
  for (const test of testsToRun.values()) {
    tests.push(test)
  }
}

function getCidFromRequestUri (requestUri: string): string | null {
  const cid = /\/ip[fn]s\/([A-Za-z0-9]+)/.exec(requestUri)
  return cid != null ? cid[1] : null
}

describe('feasibility', {}, function () {
  // if (!usingOutsideKubo || givenPathToRequestJson == null) {
  if (givenPathToRequestJson == null) {
    return
  }
  for (const { ClientRequestURI, EdgeResponseContentType, testTitle, cid, carFilePath } of tests) {
    // TODO: handle ipns requests.
    test(`${testTitle}`, async function ({ page, baseURL, rootDomain, protocol, swResponses }) {
      // const cid = getCidFromRequestUri(ClientRequestURI)
      try {
        await $({ env: { IPFS_PATH: process.env.IPFS_PATH } })`npx -y kubo dag import --pin-roots=false --offline ${carFilePath}`
      } catch (e) {
        // remove the car file because it can't be imported.. might be corrupted.. try to run `download-cars.sh` to download the car file again.
        await rm(carFilePath)
        throw e
      }

      // // ensure it loads from kuboGateway first
      // const kuboResponse = await page.goto(`http://localhost:${gatewayPort}${ClientRequestURI}`)
      // if (kuboResponse == null) {
      //   throw new Error('kuboResponse is null')
      // }
      // expect(kuboResponse.status()).toBe(200)
      // expect(kuboResponse.headers()['content-type']).toBe(EdgeResponseContentType)
      await page.goto('http://localhost:3333', { waitUntil: 'networkidle' })
      await waitForServiceWorker(page, baseURL)
      await setConfig({
        page,
        config: {
          gateways: [`http://localhost:${gatewayPort}`],
          routers: [`http://localhost:${gatewayPort}`]
        }
      })
      await page.goto(`http://localhost:3333${ClientRequestURI}`)
      // await page.waitForLoadState('networkidle')

      // const lastResponsePromise = page.waitForResponse(response => {
      //   const headers = response.headers()
      //   return response.url().includes(`http://${cid}.ipfs.${rootDomain}`) && headers['content-type'] === EdgeResponseContentType && headers['ipfs-sw'] === 'true'
      // })

      await waitForServiceWorker(page, `http://${cid}.ipfs.localhost:3333`)

      // const lastResponse = await lastResponsePromise
      // expect(lastResponse.status()).toBe(200)
      // expect(lastResponse.headers()['content-type']).toBe(EdgeResponseContentType)

      await page.waitForLoadState('networkidle')
      const lastResponse = swResponses[swResponses.length - 1]
      expect(lastResponse.status()).toBe(200)
      expect(lastResponse.headers()['content-type']).toBe(EdgeResponseContentType)
    })
  }
})

interface RequestDetails {
  ClientRequestURI: string
  ClientRequestUserAgent: string
  EdgeResponseContentType: string
  EdgeResponseStatus: string
  EdgeResponseBytes: string
  cnt: string
  testTitle: string
  carFilePath: string
  cid: string
}
async function getTests (rl: ReturnType<typeof createInterface>): Promise<Map<string, RequestDetails>> {
  const tests: Map<string, RequestDetails> = new Map<string, RequestDetails>()
  let index = 0
  const startIndex = Number(process.env.START_INDEX ?? 0)
  const totalTests = Number(process.env.TEST_COUNT ?? 999999999)
  for await (const [line] of on(rl, 'line')) {
    const jsonString = line.trim()
    if (jsonString === '') {
      continue
    }
    const json = JSON.parse(jsonString)
    const { ClientRequestURI, ClientRequestUserAgent, EdgeResponseStatus, EdgeResponseContentType, EdgeResponseBytes, cnt } = json
    if (EdgeResponseStatus !== '200') {
      // skip non 200 responses.
      continue
    }
    const testTitle = `${ClientRequestURI} ${EdgeResponseContentType}`
    if (tests.has(testTitle)) {
      // skipping duplicate test at current index.
      continue
    }
    const cid = getCidFromRequestUri(ClientRequestURI)
    if (cid == null) {
      // TODO: support ipns requests.
      continue
    }
    const carFilePath = `./test-e2e/fixtures/data/gateway-requests/${cid}.car`

    // if carFilePath doesn't exist, skip the test.
    try {
      await access(carFilePath, constants.F_OK)
    } catch (e) {
      continue
    }

    if (tests.size >= totalTests) {
      break
    }
    if (index < startIndex) {
      index++
      continue
    }
    tests.set(testTitle, {
      ClientRequestURI,
      ClientRequestUserAgent,
      EdgeResponseContentType,
      EdgeResponseStatus,
      EdgeResponseBytes,
      cnt,
      testTitle,
      carFilePath,
      cid
    })
    index++
  }
  return tests
}
