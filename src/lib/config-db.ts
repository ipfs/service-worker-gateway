import { enable } from '@libp2p/logger'
import { QUERY_PARAMS } from './constants.ts'
import { GenericIDB } from './generic-db.ts'
import type { ComponentLogger, Logger } from '@libp2p/interface'

function isPrivate (key: string): boolean {
  return key.startsWith('_')
}

export interface ConfigDb {
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

  /**
   * By default if a UnixFS directory is requested, we will check to see if an
   * `index.html` is present. If so the `index.html` file will be rendered
   * instead of a directory listing.
   *
   * Pass false here to disable this.
   *
   * @default true
   */
  supportDirectoryIndexes: boolean

  /**
   * By default if the root of a DAG contains a `_redirects` file, it will be
   * used to allow overriding paths within that DAG.
   *
   * Pass false here to disable this.
   *
   * @see https://specs.ipfs.tech/http-gateways/web-redirects-file/
   * @default true
   */
  supportWebRedirects: boolean

  /**
   * For non-HTML content, render a user-friendly HTML version of the object
   * model that allows clicking through to other blocks, converting between
   * different formats, etc.
   */
  renderHTMLViews: boolean
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
export const defaultServiceWorkerRegistrationTTL = 86_400_000 // 24 hours
export const defaultSupportDirectoryIndexes = true
export const defaultSupportWebRedirects = true
export const defaultRenderHTMLViews = true

/**
 * The default fetch timeout for the gateway, in seconds.
 */
export const defaultFetchTimeout = 30

/**
 * On dev/testing environments, (inbrowser.dev, localhost:${port}, or 127.0.0.1)
 * set the default debug config to something useful automatically
 */
export const defaultDebug = (): string => globalThis?.location?.hostname?.search(/localhost|inbrowser\.dev|127\.0\.0\.1/) === -1 ? '' : '*,*:trace'

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
  async init (referrer?: string): Promise<void> {
    // will initialize all values to defaults if necessary
    const values = await this.get()

    // try loading the config from the URL
    const compressedConfig = this.url?.searchParams.get(QUERY_PARAMS.CONFIG)

    // try to validate and use the config from the URL
    if (compressedConfig != null) {
      // take default values and overwrite them with compressed config
      const config = {
        ...values,
        ...decompressConfig(compressedConfig, referrer)
      }

      await this.validate(config)
      await this.set(config)
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
  async set (config: Partial<ConfigDb>): Promise<void> {
    enable(config.debug ?? defaultDebug()) // set debug level first.

    try {
      this.log('setting config %s for domain %s', JSON.stringify(config), this.url?.origin)
      await configDb.open()

      for (const [key, value] of Object.entries(config)) {
        // ignore private fields
        if (isPrivate(key)) {
          continue
        }

        // @ts-expect-error type could be incorrect
        await configDb.put(key, value)
      }
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
      let supportDirectoryIndexes = defaultSupportDirectoryIndexes
      let supportWebRedirects = defaultSupportWebRedirects
      let renderHTMLViews = defaultRenderHTMLViews

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
        serviceWorkerRegistrationTTL = config.serviceWorkerRegistrationTTL
        supportDirectoryIndexes = config.supportDirectoryIndexes
        supportWebRedirects = config.supportWebRedirects
        renderHTMLViews = config.renderHTMLViews
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
        supportDirectoryIndexes: supportDirectoryIndexes ?? defaultSupportDirectoryIndexes,
        supportWebRedirects: supportWebRedirects ?? defaultSupportWebRedirects,
        renderHTMLViews: renderHTMLViews ?? defaultRenderHTMLViews
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
    return compressConfig(await this.get())
  }

  /**
   * Ensure the passed config object is usable
   */
  async validate (config: Partial<ConfigDb>): Promise<void> {
    if (!config.enableRecursiveGateways && !config.enableGatewayProviders && !config.enableWss && !config.enableWebTransport) {
      this.log.error('config is invalid. At least one of the following must be enabled: recursive gateways, gateway providers, Secure WebSockets, or WebTransport')
      throw new Error('Config is invalid. At least one of the following must be enabled: recursive gateways, gateway providers, Secure WebSockets, or WebTransport')
    }
  }

  async hasConfig (): Promise<boolean> {
    await configDb.open()

    try {
      const config = await configDb.getAll()

      for (const key of Object.keys(config)) {
        if (isPrivate(key)) {
          continue
        }

        return true
      }
    } finally {
      configDb.close()
    }

    return false
  }
}

/**
 * Takes a config db object, compares each key/value pair to it's default
 * value, if different adds it to an output object which is turned into base64
 * encoded JSON.
 */
export function compressConfig (config: Partial<ConfigDb>): string {
  const values: Record<string, any> = {
    t: Date.now()
  }

  for (const [key, value] of Object.entries(config)) {
    if (isPrivate(key)) {
      continue
    }

    values[key] = value
  }

  const configJson = JSON.stringify(values)
  const base64Encoded = btoa(configJson)

  return base64Encoded
}

/**
 * Takes a compressed config string and returns a config object
 */
export function decompressConfig (compressedConfig: string, referrer: string = globalThis.document?.referrer): Partial<ConfigDb> {
  let trusted = true
  let uncompressedConfig = compressedConfig

  try {
    uncompressedConfig = atob(compressedConfig)
  } catch (err) {
    // it might just be json string encoded, so try that
    uncompressedConfig = decodeURIComponent(compressedConfig)
  }

  if (referrer == null || referrer === '') {
    /**
     * document.referrer is empty or null which means the user got to this page
     * from a direct link, not a redirect.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Document/referrer#value
     */
    trusted = false
  } else {
    const url = new URL(referrer)

    if (!globalThis.location.host.includes(url.host)) {
      trusted = false
    }
  }

  let c: ConfigDb & { t?: number }

  try {
    c = JSON.parse(uncompressedConfig)
    const timestamp = c.t

    if (timestamp == null) {
      trusted = false
    } else if (Date.now() - timestamp > 15000) {
      // if the config is more than 15 seconds old (allow for 3g latency),
      // mark it as untrusted
      trusted = false
    }
  } catch {
    return {}
  }

  let config: Partial<ConfigDb> = {}

  if (!trusted) {
    // only override allowed settings
    const allowed: Array<keyof ConfigDb> = [
      'enableWss',
      'enableWebTransport',
      'enableGatewayProviders',
      'enableRecursiveGateways',
      'debug',
      'fetchTimeout'
    ]

    for (const key of allowed) {
      if (c[key] != null) {
        // @ts-expect-error not sure why this doesn't work
        config[key] = c[key]
      }
    }
  } else {
    config = c
  }

  return config
}
