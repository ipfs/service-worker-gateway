import { enable } from '@libp2p/logger'
import LZString from 'lz-string'
import { GenericIDB } from './generic-db.js'
import type { BaseDbConfig } from './generic-db.js'
import type { ComponentLogger } from '@libp2p/logger'

export interface ConfigDbWithoutPrivateFields extends BaseDbConfig {
  gateways: string[]
  routers: string[]
  dnsJsonResolvers: Record<string, string>
  enableWss: boolean
  enableWebTransport: boolean
  enableGatewayProviders: boolean
  enableRecursiveGateways: boolean
  debug: string

  /**
   * The timeout for fetching content from the gateway, in milliseconds. User input is in seconds, but we store in milliseconds.
   */
  fetchTimeout: number
}

/**
 * Private fields for app-only config added to ConfigDbWithoutPrivateFields
 * These are not configurable by the user, and are only for programmatic use and changing functionality.
 */
export interface ConfigDb extends ConfigDbWithoutPrivateFields {
  _supportsSubdomains: null | boolean
}

export const defaultGateways = ['https://trustless-gateway.link']
export const defaultRouters = ['https://delegated-ipfs.dev']
export const defaultDnsJsonResolvers: Record<string, string> = {
  '.': 'https://delegated-ipfs.dev/dns-query'
}
export const defaultEnableRecursiveGateways = true
export const defaultEnableWss = true
export const defaultEnableWebTransport = false
export const defaultEnableGatewayProviders = true
export const defaultSupportsSubdomains: null | boolean = null

/**
 * The default fetch timeout for the gateway, in seconds.
 */
export const defaultFetchTimeout = 30

/**
 * On dev/testing environments, (inbrowser.dev, localhost:${port}, or 127.0.0.1) we should set the default debug config to helia:sw-gateway*,helia:sw-gateway*:trace so we don't need to go set it manually
 */
export const defaultDebug = (): string => self.location.hostname.search(/localhost|inbrowser\.dev|127\.0\.0\.1/) === -1 ? '' : 'helia:sw-gateway*,helia:sw-gateway*:trace,helia*,helia*:trace'

const configDb = new GenericIDB<ConfigDb>('helia-sw', 'config')

export async function resetConfig (logger: ComponentLogger): Promise<void> {
  const log = logger.forComponent('reset-config')
  try {
    await configDb.open()
    await configDb.put('gateways', defaultGateways)
    await configDb.put('routers', defaultRouters)
    await configDb.put('dnsJsonResolvers', defaultDnsJsonResolvers)
    await configDb.put('enableWss', defaultEnableWss)
    await configDb.put('enableWebTransport', defaultEnableWebTransport)
    await configDb.put('enableRecursiveGateways', defaultEnableRecursiveGateways)
    await configDb.put('enableGatewayProviders', defaultEnableGatewayProviders)
    await configDb.put('debug', defaultDebug())
    await configDb.put('fetchTimeout', defaultFetchTimeout * 1000)
    // leave private/app-only fields as is
  } catch (err) {
    log('error resetting config in db', err)
  } finally {
    configDb.close()
  }
}

export async function setConfig (config: ConfigDbWithoutPrivateFields, logger: ComponentLogger): Promise<void> {
  const log = logger.forComponent('set-config')
  enable(config.debug ?? defaultDebug()) // set debug level first.
  await validateConfig(config, logger)
  try {
    log('config-debug: setting config %s for domain %s', JSON.stringify(config), window.location.origin)
    await configDb.open()
    await configDb.put('gateways', config.gateways)
    await configDb.put('routers', config.routers)
    await configDb.put('dnsJsonResolvers', config.dnsJsonResolvers)
    await configDb.put('enableRecursiveGateways', config.enableRecursiveGateways)
    await configDb.put('enableWss', config.enableWss)
    await configDb.put('enableWebTransport', config.enableWebTransport)
    await configDb.put('enableGatewayProviders', config.enableGatewayProviders)
    await configDb.put('debug', config.debug ?? defaultDebug())
    await configDb.put('fetchTimeout', config.fetchTimeout ?? (defaultFetchTimeout * 1000))
    // ignore private/app-only fields
  } catch (err) {
    log('error setting config in db', err)
  } finally {
    configDb.close()
  }
}

let getConfigPromise: Promise<ConfigDb> | null = null

export async function getConfig (logger: ComponentLogger): Promise<ConfigDb> {
  if (getConfigPromise != null) {
    /**
     * If there is already a promise to get the config, return it.
     * This is to prevent multiple calls to the db to get the same config, because
     * each request will close the DB when done, and then the next request will fail at some point
     */
    return getConfigPromise
  }

  getConfigPromise = (async () => {
    const log = logger.forComponent('get-config')
    let gateways = defaultGateways
    let routers = defaultRouters
    let dnsJsonResolvers = defaultDnsJsonResolvers
    let enableRecursiveGateways
    let enableWss
    let enableWebTransport
    let enableGatewayProviders
    let fetchTimeout
    let debug = ''
    let _supportsSubdomains = defaultSupportsSubdomains

    let config: ConfigDb

    log('config-debug: getting config for domain %s', globalThis.location.origin)
    try {
      await configDb.open()

      config = await configDb.getAll()
      debug = config.debug ?? defaultDebug()
      enable(debug)

      gateways = config.gateways

      routers = config.routers

      dnsJsonResolvers = config.dnsJsonResolvers
      enableRecursiveGateways = config.enableRecursiveGateways ?? defaultEnableRecursiveGateways
      enableWss = config.enableWss ?? defaultEnableWss
      enableWebTransport = config.enableWebTransport ?? defaultEnableWebTransport
      enableGatewayProviders = config.enableGatewayProviders ?? defaultEnableGatewayProviders
      fetchTimeout = config.fetchTimeout ?? (defaultFetchTimeout * 1000)
      _supportsSubdomains ??= config._supportsSubdomains
    } catch (err) {
      log('error loading config from db', err)
    } finally {
      configDb.close()
    }

    if (gateways == null || gateways.length === 0) {
      gateways = [...defaultGateways]
    }

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
      enableRecursiveGateways,
      enableWss,
      enableWebTransport,
      enableGatewayProviders,
      debug,
      fetchTimeout,
      _supportsSubdomains
    }
  })().finally(() => {
    getConfigPromise = null
  })

  const result = await getConfigPromise
  return result
}

export async function validateConfig (config: ConfigDbWithoutPrivateFields, logger: ComponentLogger): Promise<void> {
  const log = logger.forComponent('validate-config')

  if (!config.enableRecursiveGateways && !config.enableGatewayProviders && !config.enableWss && !config.enableWebTransport) {
    log.error('Config is invalid. At least one of the following must be enabled: recursive gateways, gateway providers, wss, or webtransport.')
    throw new Error('Config is invalid. At least one of the following must be enabled: recursive gateways, gateway providers, wss, or webtransport.')
  }
}

/**
 * Private field setters/getters
 */
export async function setSubdomainsSupported (supportsSubdomains: boolean, logger?: ComponentLogger): Promise<void> {
  const log = logger?.forComponent('set-subdomains-supported')
  try {
    await configDb.open()
    await configDb.put('_supportsSubdomains', supportsSubdomains)
  } catch (err) {
    log?.('error setting subdomain support in db', err)
  } finally {
    configDb.close()
  }
}

/**
 * This should only be used by the service worker, or the `checkSubdomainSupport` function in the UI.
 * If you need to check for subdomain support in the UI, use the `checkSubdomainSupport` function from `check-subdomain-support.ts` instead.
 */
export async function areSubdomainsSupported (logger?: ComponentLogger): Promise<null | boolean> {
  const log = logger?.forComponent('are-subdomains-supported')
  try {
    await configDb.open()
    return await configDb.get('_supportsSubdomains') ?? defaultSupportsSubdomains
  } catch (err) {
    log?.('error loading subdomain support from db', err)
  } finally {
    configDb.close()
  }
  return false
}

export async function isConfigSet (logger?: ComponentLogger): Promise<boolean> {
  const log = logger?.forComponent('is-config-set')
  try {
    await configDb.open()
    const config = await configDb.getAll()
    // ignore private/app-only fields
    return Object.keys(config).filter(key => !['_supportsSubdomains'].includes(key)).length > 0
  } catch (err) {
    log?.('error loading config from db', err)
  } finally {
    configDb.close()
  }
  return false
}

export async function compressConfig (config: ConfigDb): Promise<string> {
  const timestamp = Date.now()
  const configJson = JSON.stringify({ config, timestamp })

  return LZString.compressToEncodedURIComponent(configJson)
}

export async function decompressConfig (compressedConfig: string): Promise<ConfigDb> {
  const { config, timestamp } = JSON.parse(LZString.decompressFromEncodedURIComponent(compressedConfig))
  // if the config is more than 10 seconds old, throw an error
  if (timestamp < Date.now() - 1000) {
    throw new Error('Config is too old. Be sure to only use trusted URLs.')
  }
  return config
}
