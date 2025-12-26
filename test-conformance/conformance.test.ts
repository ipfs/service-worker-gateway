/* eslint-env mocha */
/* eslint-disable max-nested-callbacks,no-console */

import { existsSync } from 'node:fs'
import { access, constants } from 'node:fs/promises'
import { createServer } from 'node:http'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { prefixLogger } from '@libp2p/logger'
import { peerIdFromString } from '@libp2p/peer-id'
import { test, expect } from '@playwright/test'
import { execa } from 'execa'
import { base36 } from 'multiformats/bases/base36'
import { CID } from 'multiformats/cid'
import { loadWithServiceWorker } from '../test-e2e/fixtures/load-with-service-worker.js'
import { makeFetchRequest } from '../test-e2e/fixtures/make-range-request.ts'
import { setConfig } from '../test-e2e/fixtures/set-sw-config.ts'
import { waitForServiceWorker } from '../test-e2e/fixtures/wait-for-service-worker.js'
import { GWC_IMAGE } from './fixtures/constants.js'
import expectedFailingTests from './fixtures/expected-failing-tests.json' with { type: 'json' }
import expectedPassingTests from './fixtures/expected-passing-tests.json' with { type: 'json' }
import { getReportDetails } from './fixtures/get-report-details.js'
import { getTestsToRun } from './fixtures/get-tests-to-run.js'
import { getTestsToSkip } from './fixtures/get-tests-to-skip.js'
import type { BrowserContext, Response } from '@playwright/test'
import type { IncomingHttpHeaders, Server } from 'node:http'

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
  const { stdout, stderr } = await execa('go', ['install', `github.com/ipfs/gateway-conformance/cmd/gateway-conformance@${gwcVersion}`], {
    reject: true
  })
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

let requestId = 0

test.describe('@helia/service-worker-gateway - gateway conformance', () => {
  let server: Server

  test('should run conformance suite', async ({ browser, baseURL }) => {
    try {
      // set up proxy server
      await new Promise<void>(resolve => {
        server = createServer((req, res) => {
          const id = requestId++
          let context: BrowserContext | undefined

          Promise.resolve()
            .then(async () => {
              const url = new URL(`http://${req.headers.host}${req.url}`)

              console.info('incoming', `http://${req.headers.host}${req.url}`)
              console.info('headers', req.headers)

              // replace proxy port with static asset port
              if (url.port === `${PROXY_PORT}`) {
                url.port = `${3000}`
              }

              context = await browser.newContext()
              const page = await context.newPage()

              // baseURL is localhost but request can be for loopback so ensure
              // we set the config on the correct domain
              const home = new URL(`${url.protocol}//${url.host}`)

              await page.goto(home.toString(), {
                waitUntil: 'networkidle'
              })
              await waitForServiceWorker(page)
              await setConfig(page, {
                gateways: [
                  `${process.env.KUBO_GATEWAY}`
                ],
                routers: [
                  `${process.env.KUBO_GATEWAY}`
                ],
                dnsJsonResolvers: {
                  '.': `${process.env.DNS_JSON_RESOLVER}`
                },
                acceptOriginIsolationWarning: true,
                renderHTMLViews: false
              })

              console.info('REQUEST', id, req.method, url.toString(), req.headers)

              let response: Response

              // if headers used by tests are sent, make an in-page window.fetch
              // request instead of loading a URL as this is the only way
              // specific headers can be sent
              const HEADERS = [
                'accept',
                'range',
                'if-none-match',
                'cache-control'
              ]

              if ([...Object.keys(req.headers)].some(key => HEADERS.includes(key))) {
                response = await makeFetchRequest(page, url, {
                  headers: new Headers(incomingHeadersToObject(req.headers)),
                  redirect: 'follow'
                })
              } else {
                response = await loadWithServiceWorker(page, url.toString(), {
                  redirect: maybeAsSubdomainUrlRedirect(url),

                  // all data should be local so no need to wait for long timeout
                  timeout: 10_000
                })
              }

              res.statusCode = response.status()
              res.statusMessage = response.statusText()

              console.info('RESPONSE', id, req.method, url.toString(), res.statusCode, await response.allHeaders())
              const body = await response.body()

              if (response.status() === 500) {
                console.info('RESPONSE', id, new TextDecoder().decode(body))
              }

              for (const [key, value] of Object.entries(await response.allHeaders())) {
                res.setHeader(key, value)
              }

              // res.end(await response.body())
              res.end(body)

              await context.close()
            })
            .catch(async err => {
              console.error('ERROR', id, '- could not process request')
              console.error(req.method, req.url, req.headers)
              console.error(err)

              res.statusCode = 500
              res.end(err.toString())

              context?.close({
                reason: err.message
              })
                .catch(() => {})
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

      await execa(binaryPath, getConformanceTestArgs('all', [], testArgs), {
        reject: false,
        cancelSignal
      })

      if (cancelSignal.aborted) {
        throw new Error('Conformance tests timed out')
      }

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
        if (details[name] == null) {
          // if the test was not run it means a previous test run caused the
          // test run to panic, e.g. https://github.com/ipfs/gateway-conformance/issues/251
          continue
        }

        expect.soft(details[name].result, `${name} should have passed but it failed`).toEqual('pass')

        if (details[name].result === 'fail') {
          expect.soft(details[name].output).toEqual('')
        }
      }
    })

    test('tests fail that are expected to fail', async () => {
      const details = await getReportDetails(join(__dirname, 'gwc-report-all.json'))

      for (const name of expectedFailingTests) {
        if (details[name] == null) {
          // if the test was not run it means a previous test run caused the
          // test run to panic, e.g. https://github.com/ipfs/gateway-conformance/issues/251
          continue
        }

        expect.soft(details[name].result, `${name} should have failed but it passed - run \`npm run update-conformance\` to update the list of expected passing/failing tests`).toEqual('fail')

        if (details[name].result === 'fail') {
          expect.soft(details[name].output).toEqual('')
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

function maybeAsSubdomainUrlRedirect (url: URL): string | undefined {
  // a path gateway request
  if (url.hostname === '127.0.0.1') {
    return
  }

  // already a subdomain request
  if (url.hostname.includes('.ipfs.') || url.hostname.includes('.ipns.')) {
    return
  }

  let [
    ,
    protocol,
    name,
    ...rest
  ] = url.pathname.split('/')

  if (protocol === 'ipfs') {
    name = CID.parse(name).toV1().toString()
  } else if (protocol === 'ipns') {
    try {
      name = peerIdFromString(name).toCID().toString(base36)
    } catch {
      // treat as dnslink
      name = encodeDNSLinkLabel(name)
    }
  } else {
    // don't know what this protocol is
    return
  }

  console.info('url', url.toString())
  console.info('as subdomain')
  console.info('   ', `http://${name}.${protocol}.${url.host}${rest.length > 0 ? '/' : ''}${rest.join('/')}`)

  return `http://${name}.${protocol}.${url.host}${rest.length > 0 ? '/' : ''}${rest.join('/')}`
}

function encodeDNSLinkLabel (name: string): string {
  return name.replace(/-/g, '--').replace(/\./g, '-')
}

function incomingHeadersToObject (headers: IncomingHttpHeaders): Record<string, string> {
  const output: Record<string, string> = {}

  for (let [key, value] of Object.entries(headers)) {
    if (value == null) {
      continue
    }

    if (Array.isArray(value)) {
      value = value.join(',')
    }

    output[key] = value
  }

  return output
}
