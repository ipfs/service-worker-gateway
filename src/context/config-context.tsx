import React, { createContext, useCallback, useEffect, useState } from 'react'
import { defaultDebug, defaultDnsJsonResolvers, defaultEnableGatewayProviders, defaultEnableRecursiveGateways, defaultEnableWebTransport, defaultEnableWss, defaultFetchTimeout, defaultGateways, defaultRouters, defaultServiceWorkerRegistrationTTL, defaultSupportsSubdomains, Config } from '../lib/config-db.js'
import { getUiComponentLogger, uiLogger } from '../lib/logger.js'
import type { ConfigDb, ConfigDbWithoutPrivateFields } from '../lib/config-db.js'
import type { Logger } from '@libp2p/interface'
import type { PropsWithChildren } from 'react'

type ConfigKey = keyof ConfigDb

export interface ConfigContextType extends ConfigDb {
  setConfig(key: ConfigKey, value: any): void
  resetConfig(logger?: Logger): Promise<void>
  isLoading: boolean
}

export const ConfigContext = createContext<ConfigContextType>({
  setConfigExpanded: (value: boolean) => {},
  setConfig: (key, value) => {},
  resetConfig: async () => Promise.resolve(),
  updateConfig: async (db: ConfigDbWithoutPrivateFields) => Promise.resolve(),
  gateways: defaultGateways,
  routers: defaultRouters,
  dnsJsonResolvers: defaultDnsJsonResolvers,
  enableWss: defaultEnableWss,
  enableWebTransport: defaultEnableWebTransport,
  enableGatewayProviders: defaultEnableGatewayProviders,
  enableRecursiveGateways: defaultEnableRecursiveGateways,
  debug: defaultDebug(),
  fetchTimeout: defaultFetchTimeout,
  _supportsSubdomains: defaultSupportsSubdomains,
  serviceWorkerRegistrationTTL: defaultServiceWorkerRegistrationTTL,
  isLoading: true
})

export const ConfigProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true)
  const [gateways, setGateways] = useState<string[]>(defaultGateways)
  const [routers, setRouters] = useState<string[]>(defaultRouters)
  const [dnsJsonResolvers, setDnsJsonResolvers] = useState<Record<string, string>>(defaultDnsJsonResolvers)
  const [enableWss, setEnableWss] = useState(defaultEnableWss)
  const [enableWebTransport, setEnableWebTransport] = useState(defaultEnableWebTransport)
  const [enableGatewayProviders, setEnableGatewayProviders] = useState(defaultEnableGatewayProviders)
  const [enableRecursiveGateways, setEnableRecursiveGateways] = useState(defaultEnableRecursiveGateways)
  const [debug, setDebug] = useState(defaultDebug())
  const [fetchTimeout, setFetchTimeout] = useState(defaultFetchTimeout)
  const [serviceWorkerRegistrationTTL, setServiceWorkerRegistrationTTL] = useState(defaultServiceWorkerRegistrationTTL)
  const [_supportsSubdomains, setSupportsSubdomains] = useState(defaultSupportsSubdomains)
  const log = getUiComponentLogger('config-provider')

  async function loadConfig (): Promise<void> {
    const config = new Config({
      logger: uiLogger
    })
    await config.init()

    const db = await config.get()
    setGateways(db.gateways)
    setRouters(db.routers)
    setDnsJsonResolvers(db.dnsJsonResolvers)
    setEnableWss(db.enableWss)
    setEnableWebTransport(db.enableWebTransport)
    setEnableGatewayProviders(db.enableGatewayProviders)
    setEnableRecursiveGateways(db.enableRecursiveGateways)
    setDebug(db.debug)
    setFetchTimeout(db.fetchTimeout)
    setServiceWorkerRegistrationTTL(db.serviceWorkerRegistrationTTL)
  }

  /**
   * We need to make sure that the configDb types are loaded with the values from IDB
   */
  useEffect(() => {
    void loadConfig().catch((err) => {
      log.error('Error loading config - %e', err)
    }).finally(() => {
      setIsLoading(false)
    })
  }, [])

  /**
   * Sets the config values for the context provider. To save to IDB, use the `setConfig` function from `lib/config-db.ts`.
   */
  const setConfigLocal = useCallback((key: ConfigKey, value: any) => {
    switch (key) {
      case 'gateways':
        setGateways(value)
        break
      case 'routers':
        setRouters(value)
        break
      case 'dnsJsonResolvers':
        setDnsJsonResolvers(value)
        break
      case 'enableWss':
        setEnableWss(value)
        break
      case 'enableWebTransport':
        setEnableWebTransport(value)
        break
      case 'enableGatewayProviders':
        setEnableGatewayProviders(value)
        break
      case 'enableRecursiveGateways':
        setEnableRecursiveGateways(value)
        break
      case 'debug':
        setDebug(value)
        break
      case 'fetchTimeout':
        setFetchTimeout(value)
        break
      case 'serviceWorkerRegistrationTTL':
        setServiceWorkerRegistrationTTL(value)
        break
      case '_supportsSubdomains':
        setSupportsSubdomains(value)
        break
      default:
        log.error('Unknown config key: %s', key)
        throw new Error(`Unknown config key: ${key}`)
    }
  }, [])

  const resetConfigLocal: ConfigContextType['resetConfig'] = async (): Promise<void> => {
    const config = new Config({
      logger: uiLogger
    })
    await config.reset()
    await loadConfig()
  }

  const updateConfigLocal: ConfigContextType['updateConfig'] = async (db: ConfigDbWithoutPrivateFields): Promise<void> => {
    const config = new Config({
      logger: uiLogger
    })
    await config.set(db)
    await loadConfig()
  }

  const finalConfigContext: ConfigContextType = {
    setConfig: setConfigLocal,
    resetConfig: resetConfigLocal,
    updateConfig: updateConfigLocal,
    gateways,
    routers,
    dnsJsonResolvers,
    enableWss,
    enableWebTransport,
    enableGatewayProviders,
    enableRecursiveGateways,
    fetchTimeout,
    serviceWorkerRegistrationTTL,
    debug,
    _supportsSubdomains,
    isLoading
  }

  return (
    <ConfigContext.Provider value={finalConfigContext}>
      {children}
    </ConfigContext.Provider>
  )
}
