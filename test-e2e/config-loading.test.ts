import { compressConfig } from '../src/lib/config-db.js'
import { HASH_FRAGMENTS } from '../src/lib/constants.js'
import { test, expect } from './fixtures/config-test-fixtures.js'
import { getConfig, setConfig } from './fixtures/set-sw-config.js'
import { waitForServiceWorker } from './fixtures/wait-for-service-worker.js'
import type { ConfigDbWithoutPrivateFields } from '../src/lib/config-db.js'
import type { Response as PlaywrightResponse } from 'playwright'

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
    fetchTimeout: 29 * 1000,
    serviceWorkerRegistrationTTL: 24 * 60 * 60 * 1000
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
    if (['webkit', 'safari'].includes(test.info().project.name)) {
      // @see https://github.com/ipfs/in-web-browsers/issues/206
      test.skip()
      return
    }
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

  test('config can be injected from an untrusted source', async ({ page, baseURL, rootDomain, protocol }) => {
    if (['webkit', 'safari'].includes(test.info().project.name)) {
      // @see https://github.com/ipfs/in-web-browsers/issues/206
      test.skip()
      return
    }
    const newConfig: ConfigDbWithoutPrivateFields = {
      ...testConfig,
      gateways: [
        ...testConfig.gateways,
        'https://malicious.com'
      ],
      routers: [
        ...testConfig.routers,
        'https://malicious.com/routing/v1'
      ],
      dnsJsonResolvers: {
        ...testConfig.dnsJsonResolvers,
        '.': 'https://malicious.com/dns-query'
      },
      fetchTimeout: 1 * 1000,
      debug: 'foobar123',
      enableWss: !testConfig.enableWss,
      enableWebTransport: !testConfig.enableWebTransport,
      enableRecursiveGateways: !testConfig.enableRecursiveGateways,
      enableGatewayProviders: !testConfig.enableGatewayProviders,
      serviceWorkerRegistrationTTL: 86_400_000
    }
    const compressedConfig = await compressConfig(newConfig)
    const responses: PlaywrightResponse[] = []
    page.on('response', (response) => {
      responses.push(response)
    })
    await page.goto(`${protocol}//bafkqablimvwgy3y.ipfs.${rootDomain}/#${HASH_FRAGMENTS.IPFS_SW_CFG}=${compressedConfig}`)
    await waitForServiceWorker(page, `${protocol}//bafkqablimvwgy3y.ipfs.${rootDomain}`)
    await page.waitForLoadState('networkidle')

    // we injected the config and were never redirected to the root domain
    expect(responses.map(r => r.url())).not.toContain(`${protocol}//${rootDomain}/`)

    const config = await getConfig({ page })
    // malicious urls should not exist in the config
    expect(config.gateways).not.toContain('https://malicious.com')
    expect(config.routers).not.toContain('https://malicious.com/routing/v1')
    expect(config.dnsJsonResolvers).not.toContain('https://malicious.com/dns-query')

    // things we allow to be overridden are overridden
    expect(config.fetchTimeout).toBe(newConfig.fetchTimeout)
    expect(config.debug).toBe(newConfig.debug)
    expect(config.enableWss).toBe(newConfig.enableWss)
    expect(config.enableWebTransport).toBe(newConfig.enableWebTransport)
    expect(config.enableRecursiveGateways).toBe(newConfig.enableRecursiveGateways)
    expect(config.enableGatewayProviders).toBe(newConfig.enableGatewayProviders)
  })
})
