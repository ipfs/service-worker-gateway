/* eslint-env mocha */
/* eslint-disable max-nested-callbacks */

import { createReadStream, existsSync } from 'node:fs'
import { access, constants } from 'node:fs/promises'
import { createServer } from 'node:http'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { prefixLogger } from '@libp2p/logger'
import { test, expect } from '@playwright/test'
import { execa } from 'execa'
import { loadWithServiceWorker } from '../test-e2e/fixtures/load-with-service-worker.js'
import { setConfig } from '../test-e2e/fixtures/set-sw-config.ts'
import { waitForServiceWorker } from '../test-e2e/fixtures/wait-for-service-worker.js'
import { GWC_IMAGE } from './fixtures/constants.js'
import expectedFailingTests from './fixtures/expected-failing-tests.json' with { type: 'json' }
import expectedPassingTests from './fixtures/expected-passing-tests.json' with { type: 'json' }
import { getReportDetails } from './fixtures/get-report-details.js'
import { getTestsToRun } from './fixtures/get-tests-to-run.js'
import { getTestsToSkip } from './fixtures/get-tests-to-skip.js'
import type { Server } from 'node:http'

test.describe.configure({ mode: 'serial' })

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * The proxy server is where the conformance tests send requests to - we
 * intercept the request and use the playwright browser to serve the response
 */
const PROXY_PORT = 3334

/**
 * The current level of passing tests, one day this will be 💯
 */
const SUCCESS_RATE = process.env.SUCCESS_RATE ?? 69.52

const logger = prefixLogger('gateway-conformance')
const log = logger.forComponent('output:all')

function getGatewayConformanceBinaryPath (): string {
  if (process.env.GATEWAY_CONFORMANCE_BINARY != null) {
    return process.env.GATEWAY_CONFORMANCE_BINARY
  }

  const goPath = process.env.GOPATH ?? join(homedir(), 'go')
  return join(goPath, 'bin', 'gateway-conformance')
}

async function installBinary (binaryPath: string): Promise<void> {
  const log = logger.forComponent('install-binary')

  if (process.env.GATEWAY_CONFORMANCE_BINARY != null) {
    log('Using custom gateway-conformance binary at %s', binaryPath)
    return
  }

  const gwcVersion = GWC_IMAGE.split(':').pop()
  const { stdout, stderr } = await execa('go', ['install', `github.com/ipfs/gateway-conformance/cmd/gateway-conformance@${gwcVersion}`], { reject: true })
  log(stdout)
  log.error(stderr)
}

function getConformanceTestArgs (name: string = 'all', gwcArgs: string[] = [], goTestArgs: string[] = []): string[] {
  return [
    'test',
    `--gateway-url=http://127.0.0.1:${PROXY_PORT}`,
    `--subdomain-url=http://localhost:${PROXY_PORT}`,
    '--verbose',
    '--json', join(__dirname, `gwc-report-${name}.json`),
    ...gwcArgs,
    '--',
    '-timeout', '5m',
    ...goTestArgs
  ]
}

const DOWNLOAD_CONTENT_TYPES = [
  'application/vnd.ipld.dag-json',
  'application/vnd.ipld.dag-cbor',
  'application/vnd.ipld.car',
  'application/octet-stream'
]

test.describe('@helia/service-worker-gateway - gateway conformance', () => {
  let server: Server

  test('should run conformance suite', async ({ browser, baseURL }) => {
    try {
      // set up proxy server
      await new Promise<void>(resolve => {
        server = createServer((req, res) => {
          Promise.resolve().then(async () => {
            const context = await browser.newContext()
            const page = await context.newPage()
            const downloadPromise = page.waitForEvent('download')
              .catch(() => {})

            await page.goto(baseURL ?? '', {
              waitUntil: 'networkidle'
            })
            await waitForServiceWorker(page)

            await setConfig(page, {
              gateways: [
                `${process.env.KUBO_GATEWAY}`
              ],
              routers: [
                `${process.env.KUBO_GATEWAY}/routing/v1`
              ],
              dnsJsonResolvers: {
                '.': `${process.env.DNS_JSON_RESOLVER}`
              },
              debug: 'testDebug',
              enableWss: false,
              enableWebTransport: false,
              enableRecursiveGateways: true,
              enableGatewayProviders: true,
              fetchTimeout: 29 * 1_000,
              serviceWorkerRegistrationTTL: 24 * 60 * 60 * 1000,
              acceptOriginIsolationWarning: true
            })

            const url = new URL(`http://${req.headers.host}${req.url}`)

            // replace proxy port with static asset port
            if (url.port === `${PROXY_PORT}`) {
              url.port = `${3000}`
            }

            const response = await loadWithServiceWorker(page, url.toString())

            res.statusCode = response.status()
            res.statusMessage = response.statusText()

            for (const [key, value] of Object.entries(response.headers())) {
              res.setHeader(key, value)
            }

            const contentType = await response.headerValue('content-type')

            // if the browser downloaded the file, stream the download back to
            // the conformance test client, otherwise just send the response
            // body
            if (contentType != null && DOWNLOAD_CONTENT_TYPES.includes(contentType)) {
              const download = await downloadPromise

              if (download == null) {
                throw new Error('Download was null after awaiting')
              }

              for await (const buf of createReadStream(await download.path())) {
                res.write(buf)
              }

              res.end()
            } else {
              res.end(await response.body())
            }
          })
            .catch(err => {
              // eslint-disable-next-line no-console
              console.error('could not process request', err)

              res.statusCode = 500
              res.end(err.toString())
            })
        })
        server.listen(PROXY_PORT, () => {
          resolve()
        })
      })

      // run suite
      const binaryPath = getGatewayConformanceBinaryPath()
      if (!existsSync(binaryPath)) {
        await installBinary(binaryPath)
      }

      // Get test configuration
      const testsToSkip: string[] = getTestsToSkip()
      const testsToRun: string[] = getTestsToRun()

      // Build test arguments
      const testArgs = [
        ...(testsToRun.length > 0 ? ['-run', `${testsToRun.join('|')}`] : []),
        ...(testsToSkip.length > 0 ? ['-skip', `${testsToSkip.join('|')}`] : [])
        // ...goTestArgs
      ]

      // run conformance tests
      const reportPath = join(__dirname, 'gwc-report-all.json')
      const cancelSignal = AbortSignal.timeout(640_000_000)

      const { stderr, stdout } = await execa(binaryPath, getConformanceTestArgs('all', [], testArgs), {
        reject: false,
        cancelSignal
      })

      if (cancelSignal.aborted) {
        throw new Error('Conformance tests timed out')
      }

      log(stdout)
      log.error(stderr)

      // verify report was generated
      await access(reportPath, constants.R_OK)
    } finally {
      // stop proxy server
      const closePromise = new Promise<void>(resolve => {
        if (server == null) {
          resolve()
          return
        }

        server?.close(() => {
          resolve()
        })
      })
      server?.closeAllConnections()
      await closePromise
    }
  })

  // check the output report for passing/failing tests - make multiple soft
  // assertions in a single test as each test starts a new browser context and
  // there are thousands of assertions so it would be very slow to perform one
  // assertion per test
  //
  // this is done in a nested `.describe` to ensure parsing the results is done
  // after the conformance test run
  test.describe('@helia/service-worker-gateway - parse results', () => {
    test('tests pass that are expected to pass', async () => {
      const details = await getReportDetails(join(__dirname, 'gwc-report-all.json'))

      for (const name of expectedPassingTests) {
        expect.soft(details[name], `${name} should have passed but it did not run - run \`npm run update-conformance\` to update the list of expected passing/failing tests`).toBeTruthy()
        expect.soft(details[name]?.result, `${name} should have passed but it failed`).toEqual('pass')

        if (details[name]?.result === 'fail') {
          expect.soft(details[name]?.output).toEqual('')
        }
      }
    })

    test('tests fail that are expected to fail', async () => {
      const details = await getReportDetails(join(__dirname, 'gwc-report-all.json'))

      for (const name of expectedFailingTests) {
        expect.soft(details[name], `${name} should have failed but it did not run - run \`npm run update-conformance\` to update the list of expected passing/failing tests`).toBeTruthy()
        expect.soft(details[name]?.result, `${name} should have failed but it passed - run \`npm run update-conformance\` to update the list of expected passing/failing tests`).toEqual('fail')

        if (details[name]?.result === 'fail') {
          expect.soft(details[name]?.output).toEqual('')
        }
      }
    })

    test(`has expected success rate of ${SUCCESS_RATE}%`, async () => {
      const details = await getReportDetails(join(__dirname, 'gwc-report-all.json'))
      const results = [...Object.values(details)]
      const successCount = results.reduce((acc, curr) => acc + (curr.result === 'pass' ? 1 : 0), 0)
      const failureCount = results.reduce((acc, curr) => acc + (curr.result === 'fail' ? 1 : 0), 0)
      const successRate = Number.parseFloat(((successCount / (successCount + failureCount)) * 100).toFixed(2))

      // check latest success rate with `SUCCESS_RATE=100 npm run test -- -g 'total'`
      expect(successRate).toBeGreaterThanOrEqual(Number(SUCCESS_RATE))
    })
  })
})
