import debugLib from 'debug'
import { GenericIDB, type BaseDbConfig } from './generic-db.js'
import { LOCAL_STORAGE_KEYS } from './local-storage.js'
import { log } from './logger.js'

export interface ConfigDb extends BaseDbConfig {
  gateways: string[]
  routers: string[]
  autoReload: boolean
  debug: string
}

const configDb = new GenericIDB<ConfigDb>('helia-sw', 'config')

export async function loadConfigFromLocalStorage (): Promise<void> {
  if (typeof globalThis.localStorage !== 'undefined') {
    await configDb.open()
    const localStorage = globalThis.localStorage
    const localStorageGatewaysString = localStorage.getItem(LOCAL_STORAGE_KEYS.config.gateways) ?? '["https://trustless-gateway.link"]'
    const localStorageRoutersString = localStorage.getItem(LOCAL_STORAGE_KEYS.config.routers) ?? '["https://delegated-ipfs.dev"]'
    const autoReload = localStorage.getItem(LOCAL_STORAGE_KEYS.config.autoReload) === 'true'
    const debug = localStorage.getItem(LOCAL_STORAGE_KEYS.config.debug) ?? ''
    const gateways = JSON.parse(localStorageGatewaysString)
    const routers = JSON.parse(localStorageRoutersString)
    debugLib.enable(debug)

    await configDb.put('gateways', gateways)
    await configDb.put('routers', routers)
    await configDb.put('autoReload', autoReload)
    await configDb.put('debug', debug)
    configDb.close()
  }
}

export async function setConfig (config: ConfigDb): Promise<void> {
  debugLib.enable(config.debug ?? '') // set debug level first.
  log('config-debug: setting config %O for domain %s', config, window.location.origin)

  await configDb.open()
  await configDb.put('gateways', config.gateways)
  await configDb.put('routers', config.routers)
  await configDb.put('autoReload', config.autoReload)
  await configDb.put('debug', config.debug ?? '')
  configDb.close()
}

export async function getConfig (): Promise<ConfigDb> {
  await configDb.open()

  const gateways = await configDb.get('gateways') ?? ['https://trustless-gateway.link']
  const routers = await configDb.get('routers') ?? ['https://delegated-ipfs.dev']
  const autoReload = await configDb.get('autoReload') ?? false
  const debug = await configDb.get('debug') ?? ''
  configDb.close()
  debugLib.enable(debug)

  return {
    gateways,
    routers,
    autoReload,
    debug
  }
}
