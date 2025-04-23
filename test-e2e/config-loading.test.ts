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
    enableGatewayProviders: false,
    fetchTimeout: 29 * 1000
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
    await waitForServiceWorker(page, baseURL)

    await setConfig({ page, config: testConfig })
    expect(await getConfig({ page })).toMatchObject(testConfig)
  })

  test('root config is propagated to subdomain', async ({ page, baseURL, rootDomain, protocol }) => {
    await page.goto(baseURL, { waitUntil: 'networkidle' })
    await waitForServiceWorker(page, baseURL)
    // set the config on the root..
    await setConfig({
      page,
      config: testConfig
    })
    const rootConfig = await getConfig({ page })

    // now query a new subdomain and make sure that the config on this page is the same as the root after the page loads
    await page.goto(`${protocol}//bafkqablimvwgy3y.ipfs.${rootDomain}/`)

    // wait for the service worker to be registered
    await waitForServiceWorker(page, `${protocol}//bafkqablimvwgy3y.ipfs.${rootDomain}`)

    // wait for config loading and final redirect to complete
    await page.waitForLoadState('networkidle')

    // now get the config from the subdomain
    const subdomainConfig = await getConfig({ page })

    // ensure it equals the root config (except for _supportsSubdomains which only matters on the root and won't be set on subdomains)
    expect({ ...subdomainConfig, _supportsSubdomains: rootConfig._supportsSubdomains }).toEqual(rootConfig)
    expect(subdomainConfig).toMatchObject(testConfig)

    // now we know the subdomain has the right config, but does the serviceworker?
    const serviceWorkerConfigJson = await page.evaluate(async () => {
      const response = await fetch('?ipfs-sw-config-get=true')
      return response.json()
    })

    expect(serviceWorkerConfigJson).toMatchObject(testConfig)
  })
})
