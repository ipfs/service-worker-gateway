/**
 * Ensure the config saves to IDB and on refresh, the config is loaded from IDB
 */

import { testPathRouting as test, expect } from './fixtures/config-test-fixtures.js'
import { getConfig, getConfigUi, setConfigViaUi } from './fixtures/set-sw-config.js'

test.describe('config-ui', () => {
  test('setting the config via UI actually works', async ({ page, protocol, rootDomain }) => {
    await page.goto(`${protocol}//${rootDomain}`)

    // read the config from the page
    const config = await getConfigUi({ page, expectedSwScope: `${protocol}//${rootDomain}` })

    // change the config
    const testConfig: typeof config = {
      ...config,
      gateways: ['https://example.com'],
      routers: ['https://example2.com']
    }

    // change the UI & save it
    await setConfigViaUi({ page, config: testConfig, expectedSwScope: `${protocol}//${rootDomain}` })

    // verify that the IndexedDB has the new config
    expect(await getConfig({ page })).toMatchObject(testConfig)

    // reload the page, and ensure the config is the same as the one we set
    await page.goto(`${protocol}//${rootDomain}`)
    expect(await getConfigUi({ page, expectedSwScope: `${protocol}//${rootDomain}` })).toMatchObject(testConfig)
    expect(await getConfig({ page })).toMatchObject(testConfig)
  })
})
