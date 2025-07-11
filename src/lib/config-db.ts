import { enable } from '@libp2p/logger'
import { GenericIDB } from './generic-db.js'
import { uiLogger } from './logger.js'
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

  /**
   * The TTL (time to live) for the service worker, in milliseconds.
   * This is used to determine if the service worker should be unregistered, in order to trigger a new install.
   *
   * @see https://github.com/ipfs/service-worker-gateway/issues/724
   *
   * @default 86_400_000 (24 hours)
   */
  serviceWorkerRegistrationTTL: number
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
export const defaultServiceWorkerRegistrationTTL = 86_400_000 // 24 hours

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
    await configDb.put('serviceWorkerRegistrationTTL', defaultServiceWorkerRegistrationTTL)
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
    await configDb.put('serviceWorkerRegistrationTTL', config.serviceWorkerRegistrationTTL ?? (defaultServiceWorkerRegistrationTTL * 1000))
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
    let serviceWorkerRegistrationTTL = defaultServiceWorkerRegistrationTTL
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
      serviceWorkerRegistrationTTL = config.serviceWorkerRegistrationTTL ?? defaultServiceWorkerRegistrationTTL
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
      serviceWorkerRegistrationTTL,
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

export async function compressConfig (config: ConfigDb | ConfigDbWithoutPrivateFields): Promise<string> {
  const timestamp = Date.now()
  const configJson = JSON.stringify({ ...config, t: timestamp })
  const base64Encoded = btoa(configJson)

  return base64Encoded
}

export async function decompressConfig (compressedConfig: string): Promise<ConfigDbWithoutPrivateFields> {
  const log = uiLogger.forComponent('decompress-config')
  let trusted = true
  let uncompressedConfig = compressedConfig
  try {
    uncompressedConfig = atob(compressedConfig)
  } catch (err) {
    // it might just be json string encoded, so try that
    uncompressedConfig = decodeURIComponent(compressedConfig)
  }

  if (document.referrer === '' || document.referrer == null) {
    /**
     * document.referrer is empty or null which means the user got to this page from a direct link, not a redirect.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Document/referrer#value
     */
    log('document.referrer is empty or null, so we can\'t trust it')
    trusted = false
  } else {
    const url = new URL(document.referrer)
    if (!window.location.host.includes(url.host)) {
      log('document.referrer is not from the parent domain, so we can\'t trust it')
      trusted = false
    }
  }

  let c: ConfigDbWithoutPrivateFields
  try {
    c = JSON.parse(uncompressedConfig)
    const timestamp = c.t
    if (timestamp == null) {
      log('config has no timestamp, so we can\'t trust it')
      trusted = false
    } else if (Date.now() - timestamp > 15000) {
      // if the config is more than 15 seconds old (allow for 3g latency), mark it as untrusted
      log('config is more than 15 seconds old, so we can\'t trust it')
      trusted = false
    }
  } catch (err) {
    log.error('error parsing config "%s", will use default config - %e', uncompressedConfig, err)
    return getConfig(uiLogger)
  }

  let config: ConfigDbWithoutPrivateFields
  if (!trusted) {
    const defaultConfig = await getConfig(uiLogger)
    // only override allowed settings
    config = {
      ...defaultConfig,
      enableRecursiveGateways: c.enableRecursiveGateways ?? defaultConfig.enableRecursiveGateways,
      enableWss: c.enableWss ?? defaultConfig.enableWss,
      enableWebTransport: c.enableWebTransport ?? defaultConfig.enableWebTransport,
      enableGatewayProviders: c.enableGatewayProviders ?? defaultConfig.enableGatewayProviders,
      debug: c.debug ?? defaultConfig.debug,
      fetchTimeout: c.fetchTimeout ?? defaultConfig.fetchTimeout
    }
  } else {
    config = c
  }

  return config
}
