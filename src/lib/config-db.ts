import debugLib from 'debug'
import { LOCAL_STORAGE_KEYS } from './local-storage.js'
import { log } from './logger'

export interface ConfigDb {
  gateways: string[]
  routers: string[]
  autoReload: boolean
  debug: string
}

export type configDbKeys = keyof ConfigDb

export const DB_NAME = 'helia-sw'
export const STORE_NAME = 'config'

export async function openDatabase (): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onerror = () => { reject(request.error) }
    request.onsuccess = () => { resolve(request.result) }
    request.onupgradeneeded = (event) => {
      const db = request.result
      db.createObjectStore(STORE_NAME)
    }
  })
}

export async function getFromDatabase <T extends keyof ConfigDb> (db: IDBDatabase, key: T): Promise<ConfigDb[T] | undefined> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(key)
    request.onerror = () => { reject(request.error) }
    request.onsuccess = () => { resolve(request.result) }
  })
}

export async function setInDatabase <T extends keyof ConfigDb> (db: IDBDatabase, key: T, value: ConfigDb[T]): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.put(value, key)
    request.onerror = () => { reject(request.error) }
    request.onsuccess = () => { resolve() }
  })
}

export async function closeDatabase (db: IDBDatabase): Promise<void> {
  db.close()
}

export async function loadConfigFromLocalStorage (): Promise<void> {
  if (typeof globalThis.localStorage !== 'undefined') {
    const db = await openDatabase()
    const localStorage = globalThis.localStorage
    const localStorageGatewaysString = localStorage.getItem(LOCAL_STORAGE_KEYS.config.gateways) ?? '["https://trustless-gateway.link"]'
    const localStorageRoutersString = localStorage.getItem(LOCAL_STORAGE_KEYS.config.routers) ?? '["https://delegated-ipfs.dev"]'
    const autoReload = localStorage.getItem(LOCAL_STORAGE_KEYS.config.autoReload) === 'true'
    const debug = localStorage.getItem(LOCAL_STORAGE_KEYS.config.debug) ?? ''
    const gateways = JSON.parse(localStorageGatewaysString)
    const routers = JSON.parse(localStorageRoutersString)
    debugLib.enable(debug)

    await setInDatabase(db, 'gateways', gateways)
    await setInDatabase(db, 'routers', routers)
    await setInDatabase(db, 'autoReload', autoReload)
    await setInDatabase(db, 'debug', debug)
    await closeDatabase(db)
  }
}

export async function setConfig (config: ConfigDb): Promise<void> {
  debugLib.enable(config.debug ?? '') // set debug level first.
  log('config-debug: setting config %O for domain %s', config, window.location.origin)

  const db = await openDatabase()
  await setInDatabase(db, 'gateways', config.gateways)
  await setInDatabase(db, 'routers', config.routers)
  await setInDatabase(db, 'autoReload', config.autoReload)
  await setInDatabase(db, 'debug', config.debug ?? '')
  await closeDatabase(db)
}

export async function getConfig (): Promise<ConfigDb> {
  const db = await openDatabase()

  const gateways = await getFromDatabase(db, 'gateways') ?? ['https://trustless-gateway.link']
  const routers = await getFromDatabase(db, 'routers') ?? ['https://delegated-ipfs.dev']
  const autoReload = await getFromDatabase(db, 'autoReload') ?? false
  const debug = await getFromDatabase(db, 'debug') ?? ''
  debugLib.enable(debug)

  return {
    gateways,
    routers,
    autoReload,
    debug
  }
}
