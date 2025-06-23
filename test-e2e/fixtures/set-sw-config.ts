/**
 * This fixutre is used to configure specific settings for the service worker
 * that are loaded in config-db.ts
 *
 * Note that this was only tested and confirmed working for subdomain pages.
 */
import { getConfigDebug, getConfigDnsJsonResolvers, getConfigEnableGatewayProviders, getConfigEnableRecursiveGateways, getConfigEnableWebTransport, getConfigEnableWss, getConfigFetchTimeout, getConfigGatewaysInput, getConfigPage, getConfigPageSaveButton, getConfigRoutersInput } from './locators.js'
import { waitForServiceWorker } from './wait-for-service-worker.js'
import type { ConfigDb, ConfigDbWithoutPrivateFields } from '../../src/lib/config-db.js'
import type { Page } from '@playwright/test'

export async function setConfigViaUi ({ page, config, expectedSwScope }: { page: Page, config: Partial<ConfigDb>, expectedSwScope: string }): Promise<void> {
  await waitForServiceWorker(page, expectedSwScope)

  await getConfigPage(page).isVisible()

  await getConfigGatewaysInput(page).locator('textarea').fill([process.env.KUBO_GATEWAY].join('\n'))
  await getConfigRoutersInput(page).locator('textarea').fill([process.env.KUBO_GATEWAY].join('\n'))

  if (config.enableGatewayProviders != null) {
    // scroll to the element so it's visible
    await getConfigEnableGatewayProviders(page).scrollIntoViewIfNeeded()
    await getConfigEnableGatewayProviders(page).locator('input').setChecked(config.enableGatewayProviders)
  }

  if (config.enableWss != null) {
    await getConfigEnableWss(page).scrollIntoViewIfNeeded()
    await getConfigEnableWss(page).locator('input').setChecked(config.enableWss)
  }

  if (config.enableWebTransport != null) {
    await getConfigEnableWebTransport(page).scrollIntoViewIfNeeded()
    await getConfigEnableWebTransport(page).locator('input').setChecked(config.enableWebTransport)
  }

  if (config.routers != null) {
    await getConfigRoutersInput(page).scrollIntoViewIfNeeded()
    await getConfigRoutersInput(page).locator('textarea').fill(config.routers.join('\n'))
  }

  if (config.enableRecursiveGateways != null) {
    await getConfigEnableRecursiveGateways(page).scrollIntoViewIfNeeded()
    await getConfigEnableRecursiveGateways(page).locator('input').setChecked(config.enableRecursiveGateways)
  }

  if (config.gateways != null) {
    await getConfigGatewaysInput(page).scrollIntoViewIfNeeded()
    await getConfigGatewaysInput(page).locator('textarea').fill(config.gateways.join('\n'))
  }

  // if (config.dnsJsonResolvers != null) {
  //   await getConfigDnsJsonResolvers(page).locator('input').fill(config.dnsJsonResolvers.reduce((acc, [key, value]) => {
  //     acc.push(`${key} ${value}`)
  //     return acc
  //   }, []).join('\n'))
  // }

  if (config.debug != null) {
    await getConfigDebug(page).scrollIntoViewIfNeeded()
    await getConfigDebug(page).locator('textarea').fill(config.debug)
  }
  // create a promise for waiting for the response from the service worker when the save is completed.
  const savePromise = new Promise((resolve) => {
    page.on('response', (response) => {
      if (response.url().includes('?ipfs-sw-config-reload=true')) {
        resolve(response)
      }
    })
  })
  await getConfigPageSaveButton(page).click()
  await savePromise
}

export async function getConfigUi ({ page, expectedSwScope }: { page: Page, expectedSwScope: string }): Promise<ConfigDbWithoutPrivateFields> {
  await waitForServiceWorker(page, expectedSwScope)

  await getConfigPage(page).isVisible()

  const enableGatewayProviders = await getConfigEnableGatewayProviders(page).locator('input').isChecked()
  const enableWss = await getConfigEnableWss(page).locator('input').isChecked()
  const enableWebTransport = await getConfigEnableWebTransport(page).locator('input').isChecked()
  const routers = (await getConfigRoutersInput(page).locator('textarea').inputValue()).split('\n')
  const enableRecursiveGateways = await getConfigEnableRecursiveGateways(page).locator('input').isChecked()
  const gateways = (await getConfigGatewaysInput(page).locator('textarea').inputValue()).split('\n')
  const fetchTimeout = parseInt(await getConfigFetchTimeout(page).locator('input').inputValue(), 10) * 1000
  const dnsJsonResolvers = await getConfigDnsJsonResolvers(page).locator('textarea').inputValue().then((value) => {
    return value.split('\n').reduce((acc, line) => {
      const [key, value] = line.split(' ')
      acc[key] = value
      return acc
    }, {})
  })
  const debug = await getConfigDebug(page).locator('textarea').inputValue()

  return {
    enableGatewayProviders,
    enableWss,
    enableWebTransport,
    routers,
    enableRecursiveGateways,
    gateways,
    dnsJsonResolvers,
    debug,
    fetchTimeout
  }
}

export async function setConfig ({ page, config }: { page: Page, config: Partial<ConfigDb> }): Promise<void> {
  // we can't pass through functions we already have defined, so many of these things are copied over from <root>/src/lib/generic-db.ts
  await page.evaluate(async (configInPage) => {
    const dbName = 'helia-sw'
    const storeName = 'config'
    const openDb = async (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1)
      request.onerror = () => { reject(request.error ?? new Error('Could not open DB')) }
      request.onsuccess = () => { resolve(request.result) }
      request.onupgradeneeded = (event) => {
        const db = request.result
        db.createObjectStore(storeName)
      }
    })
    const db = await openDb()
    const put = async (key: keyof ConfigDb, value): Promise<void> => {
      const transaction = db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.put(value, key)
      return new Promise((resolve, reject) => {
        request.onerror = () => { reject(request.error ?? new Error(`Could not set "${String(key)}" to "${value}" `)) }
        request.onsuccess = () => { resolve() }
      })
    }

    // for every config value passed, make sure we set them in the db
    for (const [key, value] of Object.entries(configInPage)) {
      await put(key, value)
    }

    db.close()

    const resp = await fetch('?ipfs-sw-config-reload=true')

    if (!resp.ok) {
      throw new Error('Failed to reload config')
    }
  }, {
    gateways: [process.env.KUBO_GATEWAY],
    routers: [process.env.KUBO_GATEWAY],
    ...config
  })
}

export async function getConfig ({ page }: { page: Page }): Promise<ConfigDb> {
  const config: ConfigDb = await page.evaluate(async () => {
    const dbName = 'helia-sw'
    const storeName = 'config'
    const openDb = async (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1)
      request.onerror = () => { reject(request.error ?? new Error('Could not open DB')) }
      request.onsuccess = () => { resolve(request.result) }
      request.onupgradeneeded = (event) => {
        const db = request.result
        db.createObjectStore(storeName)
      }
    })
    const db = await openDb()
    const get = async (key): Promise<any> => {
      const transaction = db.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.get(key)
      return new Promise((resolve, reject) => {
        request.onerror = () => { reject(request.error ?? new Error(`Could not get value for "${String(key)}"`)) }
        request.onsuccess = () => { resolve(request.result) }
      })
    }

    const config: ConfigDb = {
      gateways: await get('gateways'),
      routers: await get('routers'),
      dnsJsonResolvers: await get('dnsJsonResolvers'),
      enableWss: await get('enableWss'),
      enableWebTransport: await get('enableWebTransport'),
      enableRecursiveGateways: await get('enableRecursiveGateways'),
      enableGatewayProviders: await get('enableGatewayProviders'),
      debug: await get('debug'),
      _supportsSubdomains: await get('_supportsSubdomains'),
      fetchTimeout: await get('fetchTimeout')
    }

    db.close()

    return config
  }, {})

  return config
}
