import { enable } from '@libp2p/logger'
import { QUERY_PARAMS } from './constants.js'
import { GenericIDB } from './generic-db.js'
import type { BaseDbConfig } from './generic-db.js'
import type { ComponentLogger, Logger } from '@libp2p/interface'

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
 * Private fields for app-only config added to ConfigDbWithoutPrivateFields.
 *
 * These are not configurable by the user, and are only for programmatic use and
 * changing functionality.
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
 * On dev/testing environments, (inbrowser.dev, localhost:${port}, or 127.0.0.1)
 * set the default debug config to something useful automatically
 */
export const defaultDebug = (): string => self.location.hostname.search(/localhost|inbrowser\.dev|127\.0\.0\.1/) === -1 ? '' : '*,*:trace'

const configDb = new GenericIDB<ConfigDb>('helia-sw', 'config')

export interface ConfigComponents {
  logger: ComponentLogger
}

export interface ConfigInit {
  /**
   * The current page URL - if a query param under the key `QUERY_PARAMS.CONFIG`
   * is present, the value will be deserialized and used to pre-populate or
   * update the config db when `.init()` is called, otherwise if no config
   * exists the default config will be used
   */
  url?: URL
}

export class Config {
  private log: Logger
  private getConfigPromise: Promise<ConfigDb> | null
  private url?: URL

  constructor (components: ConfigComponents, init: ConfigInit = {}) {
    this.log = components.logger.forComponent('config')
    this.getConfigPromise = null

    const url = init.url ?? globalThis?.location?.href

    if (url) {
      this.url = new URL(url)
    }
  }

  /**
   * Checks the current URL for serialized config - if present overwrite the db
   * values with the passed config.
   *
   * Otherwise check the database to see if config has been set previously, if
   * not then set the default value(s).
   */
  async init (): Promise<void> {
    try {
      // try loading the config from the URL
      const compressedConfig = this.url?.searchParams.get(QUERY_PARAMS.CONFIG)

      // try to validate and use the config from the URL
      if (compressedConfig != null) {
        const config = await this.decompressConfig(compressedConfig)
        await this.validate(config)
        await this.set(config)

        return
      }
    } catch (err) {
      this.log.error('could not init config from URL - %e', err)
    }

    try {
      // if not present, check to see if we should use the default config
      const hasConfig = await this.isConfigSet()

      if (!hasConfig) {
        // init with default value
        await this.reset()
      }
    } catch (err) {
      this.log.error('could not init default config - %e', err)
      throw err
    }
  }

  /**
   * Sets all config to the default values
   */
  async reset (): Promise<void> {
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
      this.log.error('error resetting config in db - %e', err)
    } finally {
      configDb.close()
    }
  }

  /**
   * Sets config to a specific set of values
   */
  async set (config: ConfigDbWithoutPrivateFields): Promise<void> {
    enable(config.debug ?? defaultDebug()) // set debug level first.
    await this.validate(config)

    try {
      this.log('setting config %s for domain %s', JSON.stringify(config), window.location.origin)
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
      this.log('error setting config in db - %e', err)
    } finally {
      configDb.close()
    }
  }

  /**
   * Get config stored in the db
   */
  async get (): Promise<ConfigDb> {
    if (this.getConfigPromise != null) {
      /**
       * If there is already a promise to get the config, return it.
       *
       * This is to prevent multiple calls to the db to get the same config,
       * because each request will close the DB when done, and then the next
       * request will fail at some point
       */
      return this.getConfigPromise
    }

    this.getConfigPromise = (async () => {
      let gateways = defaultGateways
      let routers = defaultRouters
      let dnsJsonResolvers = defaultDnsJsonResolvers
      let enableRecursiveGateways = defaultEnableRecursiveGateways
      let enableWss = defaultEnableWss
      let enableWebTransport = defaultEnableWebTransport
      let enableGatewayProviders = defaultEnableGatewayProviders
      let fetchTimeout = defaultFetchTimeout * 1000
      let debug = defaultDebug()
      let serviceWorkerRegistrationTTL = defaultServiceWorkerRegistrationTTL
      let _supportsSubdomains = defaultSupportsSubdomains

      let config: ConfigDb

      this.log('getting config for domain %s', globalThis.location.origin)

      try {
        await configDb.open()

        config = await configDb.getAll()
        debug = config.debug ?? defaultDebug()
        enable(debug)

        gateways = config.gateways

        routers = config.routers

        dnsJsonResolvers = config.dnsJsonResolvers
        enableRecursiveGateways = config.enableRecursiveGateways
        enableWss = config.enableWss
        enableWebTransport = config.enableWebTransport
        enableGatewayProviders = config.enableGatewayProviders
        fetchTimeout = config.fetchTimeout
        _supportsSubdomains = config._supportsSubdomains
        serviceWorkerRegistrationTTL = config.serviceWorkerRegistrationTTL
      } catch (err) {
        this.log.error('error loading config from db - %e', err)
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
        gateways: gateways ?? defaultGateways,
        routers: routers ?? defaultRouters,
        dnsJsonResolvers: dnsJsonResolvers ?? defaultDnsJsonResolvers,
        enableRecursiveGateways: enableRecursiveGateways ?? defaultEnableRecursiveGateways,
        enableWss: enableWss ?? defaultEnableWss,
        enableWebTransport: enableWebTransport ?? defaultEnableWebTransport,
        enableGatewayProviders: enableGatewayProviders ?? defaultEnableGatewayProviders,
        debug: debug ?? defaultDebug(),
        fetchTimeout: fetchTimeout ?? defaultFetchTimeout * 1000,
        serviceWorkerRegistrationTTL: serviceWorkerRegistrationTTL ?? defaultServiceWorkerRegistrationTTL,
        _supportsSubdomains: _supportsSubdomains ?? defaultSupportsSubdomains
      } satisfies ConfigDb
    })().finally(() => {
      this.getConfigPromise = null
    })

    return this.getConfigPromise
  }

  /**
   * Load config from the db and return it in a form suitable for appending to
   * a URL as the `QUERY_PARAMS.CONFIG` key/value
   */
  async getCompressed (): Promise<string> {
    return this.compressConfig(await this.get())
  }

  /**
   * Ensure the passed config object is usable
   */
  async validate (config: ConfigDbWithoutPrivateFields): Promise<void> {
    if (!config.enableRecursiveGateways && !config.enableGatewayProviders && !config.enableWss && !config.enableWebTransport) {
      this.log.error('config is invalid. At least one of the following must be enabled: recursive gateways, gateway providers, wss, or webtransport.')
      throw new Error('Config is invalid. At least one of the following must be enabled: recursive gateways, gateway providers, wss, or webtransport.')
    }
  }

  async setSubdomainsSupported (supportsSubdomains: boolean): Promise<void> {
    try {
      await configDb.open()
      await configDb.put('_supportsSubdomains', supportsSubdomains)
    } catch (err) {
      this.log.error('error setting subdomain support in db - %e', err)
    } finally {
      configDb.close()
    }
  }

  /**
   * This should only be used by the service worker or the `checkSubdomainSupport`
   * function in the UI.
   *
   * If you need to check for subdomain support in the UI, use the
   * `checkSubdomainSupport` function from `check-subdomain-support.ts` instead.
   */
  async areSubdomainsSupported (): Promise<null | boolean> {
    try {
      await configDb.open()
      return await configDb.get('_supportsSubdomains') ?? defaultSupportsSubdomains
    } catch (err) {
      this.log.error('error loading subdomain support from db - %e', err)
    } finally {
      configDb.close()
    }

    return false
  }

  /**
   * Returns a promise that resolves to `true` if config has been set previously
   */
  async isConfigSet (): Promise<boolean> {
    try {
      await configDb.open()
      const config = await configDb.getAll()
      // ignore private/app-only fields
      return Object.keys(config).filter(key => !['_supportsSubdomains'].includes(key)).length > 0
    } catch (err) {
      this.log.error('error loading config from db - %e', err)
    } finally {
      configDb.close()
    }
    return false
  }

  compressConfig (config: ConfigDbWithoutPrivateFields): string {
    const timestamp = Date.now()
    const configJson = JSON.stringify({ ...config, t: timestamp })
    const base64Encoded = btoa(configJson)

    return base64Encoded
  }

  async decompressConfig (compressedConfig: string): Promise<ConfigDbWithoutPrivateFields> {
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
      this.log('document.referrer is empty or null, so we can\'t trust it')
      trusted = false
    } else {
      const url = new URL(document.referrer)

      if (!window.location.host.includes(url.host)) {
        this.log('document.referrer is not from the parent domain, so we can\'t trust it')
        trusted = false
      }
    }

    let c: ConfigDbWithoutPrivateFields

    try {
      c = JSON.parse(uncompressedConfig)
      const timestamp = c.t

      if (timestamp == null) {
        this.log('config has no timestamp, so we can\'t trust it')
        trusted = false
      } else if (Date.now() - timestamp > 15000) {
        // if the config is more than 15 seconds old (allow for 3g latency), mark it as untrusted
        this.log('config is more than 15 seconds old, so we can\'t trust it')
        trusted = false
      }
    } catch (err) {
      this.log.error('error parsing config "%s", will use default config - %e', uncompressedConfig, err)
      return this.get()
    }

    let config: ConfigDbWithoutPrivateFields

    if (!trusted) {
      const defaultConfig = await this.get()
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
}
