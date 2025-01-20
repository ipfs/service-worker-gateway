import { test, expect } from './fixtures/config-test-fixtures.js'
import { getConfig, setConfig } from './fixtures/set-sw-config.js'
import { waitForServiceWorker } from './fixtures/wait-for-service-worker.js'
import type { ConfigDbWithoutPrivateFields } from '../src/lib/config-db.js'

test.describe('ipfs-sw configuration', () => {
  const testConfig: ConfigDbWithoutPrivateFields = {
    gateways: ['http://example.com'],
    routers: ['http://example.com/routing/v1'],
    dnsJsonResolvers: {
      '.': 'example.com/dns-query'
    },
    debug: 'testDebug',
    enableWss: false,
    enableWebTransport: true,
    enableRecursiveGateways: false,
    enableGatewayProviders: false
  }
  test.beforeAll(async () => {
    if (process.env.KUBO_GATEWAY == null || process.env.KUBO_GATEWAY === '') {
      throw new Error('KUBO_GATEWAY not set')
    }
    testConfig.gateways.unshift(process.env.KUBO_GATEWAY)
    testConfig.routers.unshift(process.env.KUBO_GATEWAY)
  })

  test('setting the config actually works', async ({ page, baseURL }) => {
    await page.goto(baseURL, { waitUntil: 'networkidle' })
    await waitForServiceWorker(page)

    await setConfig({ page, config: testConfig })
    expect(await getConfig({ page })).toMatchObject(testConfig)
  })

  test('root config is propagated to subdomain', async ({ page, baseURL, rootDomain, protocol }) => {
    await page.goto(baseURL, { waitUntil: 'networkidle' })
    await waitForServiceWorker(page)
    // set the config on the root..
    await setConfig({
      page,
      config: testConfig
    })
    const rootConfig = await getConfig({ page })

    // now query a new subdomain and make sure that the config on this page is the same as the root after the page loads
    await page.goto(`${protocol}://bafkqablimvwgy3y.ipfs.${rootDomain}/`, { waitUntil: 'networkidle' })

    // now get the config from the subdomain
    await waitForServiceWorker(page)
    const subdomainConfig = await getConfig({ page })

    // ensure it equals the root config
    expect(subdomainConfig).toEqual(rootConfig)
    expect(subdomainConfig).toMatchObject(testConfig)

    // now we know the subdomain has the right config, but does the serviceworker?
    const serviceWorkerConfigJson = await page.evaluate(async () => {
      const response = await fetch('/#/ipfs-sw-config-get')
      return response.json()
    })

    expect(serviceWorkerConfigJson).toMatchObject(testConfig)
  })
})
