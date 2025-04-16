import React, { createContext, useCallback, useEffect, useState, type ReactElement } from 'react'
import { defaultDebug, defaultDnsJsonResolvers, defaultEnableGatewayProviders, defaultEnableRecursiveGateways, defaultEnableWebTransport, defaultEnableWss, defaultGateways, defaultRouters, defaultSupportsSubdomains, getConfig, resetConfig, type ConfigDb } from '../lib/config-db.js'
import { getUiComponentLogger } from '../lib/logger.js'
import type { ComponentLogger } from '@libp2p/logger'

type ConfigKey = keyof ConfigDb
export interface ConfigContextType extends ConfigDb {
  setConfig(key: ConfigKey, value: any): void
  resetConfig(logger?: ComponentLogger): Promise<void>
  isLoading: boolean
}

export const ConfigContext = createContext<ConfigContextType>({
  setConfigExpanded: (value: boolean) => {},
  setConfig: (key, value) => {},
  resetConfig: async () => Promise.resolve(),
  gateways: defaultGateways,
  routers: defaultRouters,
  dnsJsonResolvers: defaultDnsJsonResolvers,
  enableWss: defaultEnableWss,
  enableWebTransport: defaultEnableWebTransport,
  enableGatewayProviders: defaultEnableGatewayProviders,
  enableRecursiveGateways: defaultEnableRecursiveGateways,
  debug: defaultDebug(),
  fetchTimeout: 30 * 1000,
  _supportsSubdomains: defaultSupportsSubdomains,
  isLoading: true
})

export const ConfigProvider: React.FC<{ children: ReactElement[] | ReactElement, expanded?: boolean }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true)
  const [gateways, setGateways] = useState<string[]>(defaultGateways)
  const [routers, setRouters] = useState<string[]>(defaultRouters)
  const [dnsJsonResolvers, setDnsJsonResolvers] = useState<Record<string, string>>(defaultDnsJsonResolvers)
  const [enableWss, setEnableWss] = useState(defaultEnableWss)
  const [enableWebTransport, setEnableWebTransport] = useState(defaultEnableWebTransport)
  const [enableGatewayProviders, setEnableGatewayProviders] = useState(defaultEnableGatewayProviders)
  const [enableRecursiveGateways, setEnableRecursiveGateways] = useState(defaultEnableRecursiveGateways)
  const [debug, setDebug] = useState(defaultDebug())
  const [fetchTimeout, setFetchTimeout] = useState(30 * 1000)
  const [_supportsSubdomains, setSupportsSubdomains] = useState(defaultSupportsSubdomains)
  const logger = getUiComponentLogger('config-context')
  const log = logger.forComponent('main')

  async function loadConfig (): Promise<void> {
    const config = await getConfig(logger)
    setGateways(config.gateways)
    setRouters(config.routers)
    setDnsJsonResolvers(config.dnsJsonResolvers)
    setEnableWss(config.enableWss)
    setEnableWebTransport(config.enableWebTransport)
    setEnableGatewayProviders(config.enableGatewayProviders)
    setEnableRecursiveGateways(config.enableRecursiveGateways)
    setDebug(config.debug)
    setFetchTimeout(config.fetchTimeout)
  }
  /**
   * We need to make sure that the configDb types are loaded with the values from IDB
   */
  useEffect(() => {
    void loadConfig().catch((err) => {
      log.error('Error loading config', err)
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
      case '_supportsSubdomains':
        setSupportsSubdomains(value)
        break
      default:
        log.error(`Unknown config key: ${key}`)
        throw new Error(`Unknown config key: ${key}`)
    }
  }, [])

  const resetConfigLocal: ConfigContextType['resetConfig'] = async (givenLogger): Promise<void> => {
    await resetConfig(givenLogger ?? logger)
    await loadConfig()
  }

  const finalConfigContext: ConfigContextType = {
    setConfig: setConfigLocal,
    resetConfig: resetConfigLocal,
    gateways,
    routers,
    dnsJsonResolvers,
    enableWss,
    enableWebTransport,
    enableGatewayProviders,
    enableRecursiveGateways,
    fetchTimeout,
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
