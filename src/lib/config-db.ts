import debugLib from 'debug'
import { GenericIDB, type BaseDbConfig } from './generic-db.js'
import { LOCAL_STORAGE_KEYS } from './local-storage.js'
import type { ComponentLogger } from '@libp2p/logger'

export interface ConfigDb extends BaseDbConfig {
  gateways: string[]
  routers: string[]
  dnsJsonResolvers: Record<string, string>
  autoReload: boolean
  p2pRetrieval: boolean
  debug: string
}

export const defaultGateways = ['https://trustless-gateway.link']
export const defaultRouters = ['https://delegated-ipfs.dev']
export const defaultDnsJsonResolvers: Record<string, string> = {
  '.': 'https://delegated-ipfs.dev/dns-query'
}
export const defaultP2pRetrieval = true

const configDb = new GenericIDB<ConfigDb>('helia-sw', 'config')

export async function loadConfigFromLocalStorage (): Promise<void> {
  if (typeof globalThis.localStorage !== 'undefined') {
    await configDb.open()
    const localStorage = globalThis.localStorage
    const localStorageGatewaysString = localStorage.getItem(LOCAL_STORAGE_KEYS.config.gateways) ?? JSON.stringify([])
    const localStorageRoutersString = localStorage.getItem(LOCAL_STORAGE_KEYS.config.routers) ?? JSON.stringify(defaultRouters)
    const localStorageDnsResolvers = localStorage.getItem(LOCAL_STORAGE_KEYS.config.dnsJsonResolvers) ?? JSON.stringify(defaultDnsJsonResolvers)
    const autoReload = localStorage.getItem(LOCAL_STORAGE_KEYS.config.autoReload) === 'true'
    const p2pRetrieval = localStorage.getItem(LOCAL_STORAGE_KEYS.config.p2pRetrieval) === 'true'
    const debug = localStorage.getItem(LOCAL_STORAGE_KEYS.config.debug) ?? ''
    const gateways = JSON.parse(localStorageGatewaysString)
    const routers = JSON.parse(localStorageRoutersString)
    const dnsJsonResolvers = JSON.parse(localStorageDnsResolvers)
    debugLib.enable(debug)

    await configDb.put('gateways', gateways)
    await configDb.put('routers', routers)
    await configDb.put('dnsJsonResolvers', dnsJsonResolvers)
    await configDb.put('autoReload', autoReload)
    await configDb.put('p2pRetrieval', p2pRetrieval)
    await configDb.put('debug', debug)
    configDb.close()
  }
}

export async function resetConfig (): Promise<void> {
  await configDb.open()
  localStorage.removeItem(LOCAL_STORAGE_KEYS.config.gateways)
  await configDb.put('gateways', defaultGateways)
  localStorage.removeItem(LOCAL_STORAGE_KEYS.config.routers)
  await configDb.put('routers', defaultRouters)
  localStorage.removeItem(LOCAL_STORAGE_KEYS.config.dnsJsonResolvers)
  await configDb.put('dnsJsonResolvers', defaultDnsJsonResolvers)
  localStorage.removeItem(LOCAL_STORAGE_KEYS.config.autoReload)
  await configDb.put('autoReload', false)
  localStorage.removeItem(LOCAL_STORAGE_KEYS.config.p2pRetrieval)
  await configDb.put('p2pRetrieval', defaultP2pRetrieval)
  localStorage.removeItem(LOCAL_STORAGE_KEYS.config.debug)
  await configDb.put('debug', '')
  configDb.close()
}

export async function setConfig (config: ConfigDb, logger: ComponentLogger): Promise<void> {
  const log = logger.forComponent('set-config')
  debugLib.enable(config.debug ?? '') // set debug level first.
  log('config-debug: setting config %O for domain %s', config, window.location.origin)

  await configDb.open()
  await configDb.put('gateways', config.gateways)
  await configDb.put('routers', config.routers)
  await configDb.put('dnsJsonResolvers', config.dnsJsonResolvers)
  await configDb.put('autoReload', config.autoReload)
  await configDb.put('p2pRetrieval', config.p2pRetrieval)
  await configDb.put('debug', config.debug ?? '')
  configDb.close()
}

export async function getConfig (logger: ComponentLogger): Promise<ConfigDb> {
  const log = logger.forComponent('get-config')
  let gateways = defaultGateways
  let routers = defaultRouters
  let dnsJsonResolvers = defaultDnsJsonResolvers
  let autoReload = false
  let p2pRetrieval = defaultP2pRetrieval

  let debug = ''

  try {
    await configDb.open()

    gateways = await configDb.get('gateways')

    routers = await configDb.get('routers')

    dnsJsonResolvers = await configDb.get('dnsJsonResolvers')

    p2pRetrieval = await configDb.get('p2pRetrieval') ?? defaultP2pRetrieval

    autoReload = await configDb.get('autoReload') ?? false
    debug = await configDb.get('debug') ?? ''
    configDb.close()
    debugLib.enable(debug)
  } catch (err) {
    log('error loading config from db', err)
  }

  // if (gateways == null || gateways.length === 0) {
  //   gateways = [...defaultGateways]
  // }

  if (routers == null || routers.length === 0) {
    routers = [...defaultRouters]
  }
  if (dnsJsonResolvers == null || Object.keys(dnsJsonResolvers).length === 0) {
    dnsJsonResolvers = { ...defaultDnsJsonResolvers }
  }

  // always return the config, even if we failed to load it.
  return {
    gateways,
    routers,
    dnsJsonResolvers,
    autoReload,
    p2pRetrieval,
    debug
  }
}
