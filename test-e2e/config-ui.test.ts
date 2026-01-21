/**
 * Ensure the config saves to IDB and on refresh, the config is loaded from IDB
 */

import { HASH_FRAGMENTS } from '../src/lib/constants.js'
import { test, expect } from './fixtures/config-test-fixtures.js'
import { getConfig, getConfigUi, setConfigViaUi } from './fixtures/set-sw-config.js'

test.describe('config-ui', () => {
  test('setting the config via UI actually works', async ({ page, baseURL, protocol, host }) => {
    await page.goto(`${baseURL}/#${HASH_FRAGMENTS.IPFS_SW_CONFIG_UI}`, {
      waitUntil: 'networkidle'
    })

    // read the config from the page
    const config = await getConfigUi({ page, expectedSwScope: `${baseURL}` })

    // change the config
    const testConfig = {
      ...config,
      gateways: ['https://example.com'],
      routers: ['https://example2.com']
    }

    // change the UI & save it
    await setConfigViaUi({ page, config: testConfig, expectedSwScope: `${baseURL}` })

    // verify that the IndexedDB has the new config
    expect(await getConfig(page)).toMatchObject(testConfig)

    // reload the page, and ensure the config is the same as the one we set
    await page.goto(`${baseURL}/#${HASH_FRAGMENTS.IPFS_SW_CONFIG_UI}`, {
      waitUntil: 'networkidle'
    })
    expect(await getConfigUi({ page, expectedSwScope: `${baseURL}` })).toMatchObject(testConfig)
    expect(await getConfig(page)).toMatchObject(testConfig)
  })
})
