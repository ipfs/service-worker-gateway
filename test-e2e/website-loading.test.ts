import { test, expect } from '@playwright/test'
import { createKuboNode } from './fixtures/create-kubo-node.js'
import { loadFixtureDataCar } from './fixtures/load-fixture-data.js'
import { setConfig } from './fixtures/set-sw-config.js'
import { waitForServiceWorker } from './fixtures/wait-for-service-worker.js'
import type { ConfigDb } from '../src/lib/config-db.js'
import type { Controller } from 'ipfsd-ctl'

test.describe('website-loading', () => {
  let controller: Controller<'go'>
  let config: Partial<ConfigDb>

  test.beforeAll(async () => {
    controller = await createKuboNode()
    await controller.start()
    await loadFixtureDataCar(controller, 'gateway-conformance-fixtures.car')
    config = {
      gateways: [`http://${controller.api.gatewayHost}:${controller.api.gatewayPort}`],
      routers: [`http://${controller.api.gatewayHost}:${controller.api.gatewayPort}`]
    }
  })

  test.beforeEach(async ({ page }) => {
    // not testing subdomain redirection here
    await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle' })
    await setConfig({ page, config })
    await waitForServiceWorker(page)
  })

  test('ensure unixfs directory trailing slash is added', async ({ page }) => {
    const response = await page.goto('http://127.0.0.1:3000/ipfs/bafybeifq2rzpqnqrsdupncmkmhs3ckxxjhuvdcbvydkgvch3ms24k5lo7q')

    // playwright follows redirects so we won't see the 301
    expect(response?.status()).toBe(200)
    expect(response?.url()).toBe('http://127.0.0.1:3000/ipfs/bafybeifq2rzpqnqrsdupncmkmhs3ckxxjhuvdcbvydkgvch3ms24k5lo7q/')
  })

  test('ensure that index.html is returned for the root path', async ({ page }) => {
    const response = await page.goto('http://127.0.0.1:3000/ipfs/bafybeifq2rzpqnqrsdupncmkmhs3ckxxjhuvdcbvydkgvch3ms24k5lo7q/')

    expect(response?.status()).toBe(200)
    const headers = await response?.allHeaders()

    expect(headers?.['content-type']).toContain('text/html')
    expect(headers?.['cache-control']).toBe('public, max-age=29030400, immutable')

    const bodyBuffer = await response?.body()
    expect(bodyBuffer?.byteLength).toBe(6)
    const bodyText = await response?.text()
    expect(bodyText).toBe('hello\n')
  })
})
