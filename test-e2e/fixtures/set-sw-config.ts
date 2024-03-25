/**
 * This fixutre is used to configure specific settings for the service worker
 * that are loaded in config-db.ts
 *
 * Note that this was only tested and confirmed working for subdomain pages.
 */
import { waitForServiceWorker } from './wait-for-service-worker.js'
import type { ConfigDb } from '../../src/lib/config-db.js'
import type { Page } from '@playwright/test'

// TODO: ensure that the config can be set on root and loaded properly by subdomains with playwright
export async function setConfig ({ page, config }: { page: Page, config: Partial<ConfigDb> }): Promise<void> {
  await waitForServiceWorker(page)
  // we can't pass through functions we already have defined, so many of these things are copied over from <root>/src/lib/generic-db.ts
  await page.evaluate(async (configInPage) => {
    const dbName = 'helia-sw'
    const storeName = 'config'
    const openDb = async (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1)
      request.onerror = () => { reject(request.error) }
      request.onsuccess = () => { resolve(request.result) }
      request.onupgradeneeded = (event) => {
        const db = request.result
        db.createObjectStore(storeName)
      }
    })
    const db = await openDb()
    const put = async (key, value): Promise<void> => {
      const transaction = db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.put(value, key)
      return new Promise((resolve, reject) => {
        request.onerror = () => { reject(request.error) }
        request.onsuccess = () => { resolve() }
      })
    }

    // for every config value passed, make sure we set them in the db
    for (const [key, value] of Object.entries(configInPage)) {
      await put(key, value)
    }

    db.close()

    /**
     * We need to do an operation like HeliaServiceWorkerCommsChannel.messageAndWaitForResponse
     * see {@link HeliaServiceWorkerCommsChannel} for more information
     */
    const channel = new BroadcastChannel('helia:sw')
    const swResponsePromise = new Promise<void>((resolve, reject) => {
      const onSuccess = (e: MessageEvent): void => {
        if (e.data.action === 'RELOAD_CONFIG_SUCCESS') {
          resolve()
          channel.removeEventListener('message', onSuccess)
        }
      }
      channel.addEventListener('message', onSuccess)
    })
    channel.postMessage({ target: 'SW', action: 'RELOAD_CONFIG', source: 'WINDOW' })
    await swResponsePromise
    // TODO: we shouldn't need this. We should be able to just post a message to the service worker to reload it's config.
    window.postMessage({ source: 'helia-sw-config-iframe', target: 'PARENT', action: 'RELOAD_CONFIG', config: configInPage }, { targetOrigin: window.location.origin })
  }, config)
}
