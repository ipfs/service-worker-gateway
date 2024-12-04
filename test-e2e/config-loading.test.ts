import { testSubdomainRouting as test, expect } from './fixtures/config-test-fixtures.js'
import { getConfig, setConfig } from './fixtures/set-sw-config.js'
import { waitForServiceWorker } from './fixtures/wait-for-service-worker.js'
import type { ConfigDb } from '../src/lib/config-db'

test.describe('ipfs-sw configuration', () => {
  const testConfig: ConfigDb = {
    gateways: [process.env.KUBO_GATEWAY as string, 'http://example.com'],
    routers: [process.env.KUBO_GATEWAY as string, 'http://example.com/routing/v1'],
    dnsJsonResolvers: {
      '.': 'example.com/dns-query'
    },
    debug: 'testDebug',
    enableWss: false,
    enableWebTransport: true,
    enableRecursiveGateways: false,
    enableGatewayProviders: false
  }
  test('setting the config actually works', async ({ page, baseURL }) => {
    await page.goto(baseURL, { waitUntil: 'networkidle' })
    await waitForServiceWorker(page)

    await setConfig({ page, config: testConfig })
    expect(await getConfig({ page })).toEqual(testConfig)
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
    expect(subdomainConfig).toEqual(testConfig)
  })
})
