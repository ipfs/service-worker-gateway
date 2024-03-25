import { test, expect } from '@playwright/test'
import { createKuboNode } from './fixtures/create-kubo-node.js'
import { loadFixtureDataCar } from './fixtures/load-fixture-data.js'
import { setConfig } from './fixtures/set-sw-config.js'
import { waitForServiceWorker } from './fixtures/wait-for-service-worker.js'
import type { ConfigDb } from '../src/lib/config-db.js'
import type { Controller } from 'ipfsd-ctl'

test.describe('hamt-dir', () => {
  let controller: Controller<'go'>
  let config: Partial<ConfigDb>

  test.beforeAll(async () => {
    controller = await createKuboNode()
    await controller.start()
    await loadFixtureDataCar(controller, 'single-layer-hamt-with-multi-block-files.car')
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

  test('can open UnixFS file from HAMT-sharded directory', async ({ page }) => {
    const response = await page.goto('http://127.0.0.1:3000/ipfs/bafybeidbclfqleg2uojchspzd4bob56dqetqjsj27gy2cq3klkkgxtpn4i/685.txt')

    expect(response?.status()).toBe(200)
    const headers = await response?.allHeaders()

    expect(headers?.['content-type']).toContain('text/plain')
    expect(headers?.['cache-control']).toBe('public, max-age=29030400, immutable')

    const bodyBuffer = await response?.body()
    expect(bodyBuffer?.byteLength).toBe(1026)
  })
})
