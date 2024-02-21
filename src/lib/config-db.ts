import { getLocalStorageKey } from './local-storage.ts'

export interface ConfigDb {
  gateways: string[]
  routers: string[]
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
    const localStorageGatewaysString = localStorage.getItem(getLocalStorageKey('config', 'gateways')) ?? '[]'
    const localStorageRoutersString = localStorage.getItem(getLocalStorageKey('config', 'routers')) ?? '[]'
    const gateways = JSON.parse(localStorageGatewaysString)
    const routers = JSON.parse(localStorageRoutersString)

    await setInDatabase(db, 'gateways', gateways)
    await setInDatabase(db, 'routers', routers)
    await closeDatabase(db)
  }
}

export async function getConfig (): Promise<ConfigDb> {
  const db = await openDatabase()

  const gateways = await getFromDatabase(db, 'gateways') ?? []
  const routers = await getFromDatabase(db, 'routers') ?? []

  return {
    gateways: gateways instanceof Array ? gateways : [],
    routers: routers instanceof Array ? routers : []
  }
}
