import React, { createContext, useCallback, useEffect, useState } from 'react'
import { getConfig, type ConfigDb } from '../lib/config-db.js'
import { isConfigPage } from '../lib/is-config-page.js'
import { getUiComponentLogger } from '../lib/logger.js'

const isLoadedInIframe = window.self !== window.top

type ConfigKey = keyof ConfigDb
export interface ConfigContextType extends ConfigDb {
  isConfigExpanded: boolean
  setConfigExpanded(value: boolean): void
  setConfig(key: ConfigKey, value: any): void
}

export const ConfigContext = createContext<ConfigContextType>({
  isConfigExpanded: isLoadedInIframe,
  setConfigExpanded: (value: boolean) => {},
  setConfig: (key, value) => {},
  gateways: [],
  routers: [],
  dnsJsonResolvers: {},
  enableWss: false,
  enableWebTransport: false,
  enableGatewayProviders: false,
  enableRecursiveGateways: false,
  debug: ''
})

export const ConfigProvider = ({ children }: { children: JSX.Element[] | JSX.Element, expanded?: boolean }): JSX.Element => {
  const [isConfigExpanded, setConfigExpanded] = useState(isConfigPage(window.location.hash))
  const [gateways, setGateways] = useState<string[]>([])
  const [routers, setRouters] = useState<string[]>([])
  const [dnsJsonResolvers, setDnsJsonResolvers] = useState<Record<string, string>>({})
  const [enableWss, setEnableWss] = useState(false)
  const [enableWebTransport, setEnableWebTransport] = useState(false)
  const [enableGatewayProviders, setEnableGatewayProviders] = useState(false)
  const [enableRecursiveGateways, setEnableRecursiveGateways] = useState(false)
  const [debug, setDebug] = useState('')
  const isExplicitlyLoadedConfigPage = isConfigPage(window.location.hash)
  /**
   * We need to make sure that the configDb types are loaded with the values from IDB
   */
  useEffect(() => {
    void (async () => {
      const config = await getConfig(getUiComponentLogger('config-context'))
      setGateways(config.gateways)
      setRouters(config.routers)
      setDnsJsonResolvers(config.dnsJsonResolvers)
      setEnableWss(config.enableWss)
      setEnableWebTransport(config.enableWebTransport)
      setEnableGatewayProviders(config.enableGatewayProviders)
      setEnableRecursiveGateways(config.enableRecursiveGateways)
      setDebug(config.debug)
    })()
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
      default:
        throw new Error(`Unknown config key: ${key}`)
    }
  }, [])

  const setConfigExpandedWrapped = (value: boolean): void => {
    if (isLoadedInIframe || isExplicitlyLoadedConfigPage) {
      // ignore it
    } else {
      setConfigExpanded(value)
    }
  }

  return (
    <ConfigContext.Provider value={{ isConfigExpanded, setConfigExpanded: setConfigExpandedWrapped, setConfig: setConfigLocal, gateways, routers, dnsJsonResolvers, enableWss, enableWebTransport, enableGatewayProviders, enableRecursiveGateways, debug }}>
      {children}
    </ConfigContext.Provider>
  )
}
