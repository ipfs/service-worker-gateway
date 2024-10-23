import React, { useCallback, useEffect, useState } from 'react'
import Header from '../components/Header.jsx'
import { Collapsible } from '../components/collapsible.jsx'
import LocalStorageInput from '../components/local-storage-input.jsx'
import { LocalStorageToggle } from '../components/local-storage-toggle.jsx'
import { ServiceWorkerReadyButton } from '../components/sw-ready-button.jsx'
import { ConfigProvider } from '../context/config-context.jsx'
import { RouteContext } from '../context/router-context.jsx'
import { ServiceWorkerProvider } from '../context/service-worker-context.jsx'
import { HeliaServiceWorkerCommsChannel } from '../lib/channel.js'
import { defaultDnsJsonResolvers, defaultEnableGatewayProviders, defaultEnableRecursiveGateways, defaultEnableWebTransport, defaultEnableWss, defaultGateways, defaultRouters, getConfig, localStorageToIdb, resetConfig } from '../lib/config-db.js'
import { LOCAL_STORAGE_KEYS, convertDnsResolverInputToObject, convertDnsResolverObjectToInput, convertUrlArrayToInput, convertUrlInputToArray } from '../lib/local-storage.js'
import { getUiComponentLogger, uiLogger } from '../lib/logger.js'
import './default-page-styles.css'

const uiComponentLogger = getUiComponentLogger('config-page')
const log = uiLogger.forComponent('config-page')
const channel = new HeliaServiceWorkerCommsChannel('WINDOW', uiComponentLogger)

/**
 * Converts newline delimited URLs to an array of URLs, and validates each URL.
 */
const urlValidationFn = (value: string): Error | null => {
  try {
    const urls: string[] = convertUrlInputToArray(value)
    let i = 0
    if (urls.length === 0) {
      throw new Error('At least one URL is required. Reset the config to use defaults.')
    }
    try {
      urls.map((url, index) => {
        i = index
        return new URL(url)
      })
    } catch (e) {
      throw new Error(`URL "${urls[i]}" on line ${i} is not valid`)
    }
    return null
  } catch (err) {
    return err as Error
  }
}

/**
 * Converts newline delimited URLs to an array of URLs, and validates each URL.
 */
const singleUrlValidationFn = (value: string): Error | null => {
  try {
    const urls: string[] = convertUrlInputToArray(value)
    let i = 0
    if (urls.length === 0) {
      throw new Error('At least one URL is required. Reset the config to use defaults.')
    }
    if (urls.length > 1) {
      throw new Error('Only one URL is allowed. Reset the config to use defaults.')
    }
    try {
      urls.map((url, index) => {
        i = index
        return new URL(url)
      })
    } catch (e) {
      throw new Error(`URL "${urls[i]}" on line ${i} is not valid`)
    }
    return null
  } catch (err) {
    return err as Error
  }
}

/**
 * Converts newline delimited patterns of space delimited key+value pairs to a JSON object, and validates each URL.
 *
 * @example
 * ```
 * . https://delegated-ipfs.dev/dns-query
 * .com https://cloudflare-dns.com/dns-query
 * .eth https://eth.link/dns-query
 * ```
 */
const dnsJsonValidationFn = (value: string): Error | null => {
  try {
    const urls: Record<string, string> = convertDnsResolverInputToObject(value)
    let i = 0
    if (Object.keys(urls).length === 0) {
      throw new Error('At least one URL is required. Reset the config to use defaults.')
    }
    try {
      Object.entries(urls).map(([key, url], index) => {
        i = index
        return new URL(url)
      })
    } catch (e) {
      if (urls[i] != null) {
        throw new Error(`URL "${urls[i]}" at index ${i} is not valid`)
      }
      throw new Error(`Input on line ${i} with key "${Object.keys(urls)[i]}" is not valid`)
    }
    return null
  } catch (err) {
    return err as Error
  }
}

const stringValidationFn = (value: string): Error | null => {
  // we accept any string
  return null
}

function ConfigPage (): React.JSX.Element | null {
  const { gotoPage } = React.useContext(RouteContext)
  const [error, setError] = useState<Error | null>(null)
  const [resetKey, setResetKey] = useState(0)

  const isLoadedInIframe = window.self !== window.top

  const postFromIframeToParentSw = useCallback(async () => {
    if (!isLoadedInIframe) {
      return
    }
    // we get the iframe origin from a query parameter called 'origin', if this is loaded in an iframe
    const targetOrigin = decodeURIComponent(window.location.hash.split('@origin=')[1])
    const config = await getConfig(uiComponentLogger)
    log.trace('config-page: postMessage config to origin ', config, targetOrigin)
    /**
     * The reload page in the parent window is listening for this message, and then it passes a RELOAD_CONFIG message to the service worker
     */
    window.parent?.postMessage({ source: 'helia-sw-config-iframe', target: 'PARENT', action: 'RELOAD_CONFIG', config }, {
      targetOrigin
    })
    log.trace('config-page: RELOAD_CONFIG sent to parent window')
  }, [])

  useEffect(() => {
    /**
     * On initial load, we want to send the config to the parent window, so that the reload page can auto-reload if enabled, and the subdomain registered service worker gets the latest config without user interaction.
     */
    void postFromIframeToParentSw()
  }, [])

  const saveConfig = useCallback(async () => {
    try {
      await localStorageToIdb()
      log.trace('config-page: sending RELOAD_CONFIG to service worker')
      // update the BASE_URL service worker
      await channel.messageAndWaitForResponse('SW', { target: 'SW', action: 'RELOAD_CONFIG' })
      // base_domain service worker is updated
      log.trace('config-page: RELOAD_CONFIG_SUCCESS for %s', window.location.origin)
      // update the <subdomain>.<namespace>.BASE_URL service worker
      await postFromIframeToParentSw()
      if (!isLoadedInIframe) {
        gotoPage()
      }
    } catch (err) {
      log.error('Error saving config', err)
      setError(err as Error)
    }
  }, [])

  const doResetConfig = useCallback(async () => {
    // we need to clear out the localStorage items and make sure default values are set, and that all of our inputs are updated
    await resetConfig()
    // now reload all the inputs
    setResetKey((prev) => prev + 1)
  }, [])

  const newlineToJsonArray = (value: string): string => JSON.stringify(convertUrlInputToArray(value))
  const jsonToNewlineString = (value: string): string => convertUrlArrayToInput(JSON.parse(value))

  return (
    <>
    {!isLoadedInIframe && <Header /> }
    <main className='e2e-config-page pa4-l bg-snow mw7 center pa4'>
      <Collapsible collapsedLabel="View config" expandedLabel='Hide config' collapsed={isLoadedInIframe}>
      <LocalStorageToggle
        className="e2e-config-page-input"
        label="Enable Recursive Gateways"
        description="Use recursive gateways configured below for retrieval of content."
        defaultValue={defaultEnableRecursiveGateways}
        localStorageKey={LOCAL_STORAGE_KEYS.config.enableRecursiveGateways}
        resetKey={resetKey}
      />
        <LocalStorageInput
          className="e2e-config-page-input e2e-config-page-input-gateways"
          description="A newline delimited list of recursive trustless gateway URLs."
          localStorageKey={LOCAL_STORAGE_KEYS.config.gateways}
          label='Recursive Gateways'
          validationFn={urlValidationFn}
          defaultValue={convertUrlArrayToInput(defaultGateways)}
          preSaveFormat={newlineToJsonArray}
          postLoadFormat={jsonToNewlineString}
          resetKey={resetKey}
        />
        <LocalStorageToggle
          className="e2e-config-page-input"
          label="Enable Delegated HTTP Gateway Providers"
          description="Use gateway providers returned from delegated routers for direct retrieval."
          defaultValue={defaultEnableGatewayProviders}
          localStorageKey={LOCAL_STORAGE_KEYS.config.enableGatewayProviders}
          resetKey={resetKey}
        />
        <LocalStorageToggle
          className="e2e-config-page-input"
          label="Enable Secure WebSocket Providers"
          description="Use Secure WebSocket providers returned from delegated routers for direct retrieval."
          defaultValue={defaultEnableWss}
          localStorageKey={LOCAL_STORAGE_KEYS.config.enableWss}
          resetKey={resetKey}
        />
        <LocalStorageToggle
          className="e2e-config-page-input"
          label="Enable WebTransport Providers"
          description="Use WebTransport providers returned from delegated routers for direct retrieval."
          defaultValue={defaultEnableWebTransport}
          localStorageKey={LOCAL_STORAGE_KEYS.config.enableWebTransport}
          resetKey={resetKey}
        />
        {/* For now we only accept a single router URL */}
        <LocalStorageInput
          className="e2e-config-page-input e2e-config-page-input-routers"
          description="A newline delimited list of delegated IPFS router URLs."
          localStorageKey={LOCAL_STORAGE_KEYS.config.routers}
          label='Routers'
          validationFn={singleUrlValidationFn}
          defaultValue={convertUrlArrayToInput(defaultRouters)}
          preSaveFormat={newlineToJsonArray}
          postLoadFormat={jsonToNewlineString}
          resetKey={resetKey}
        />
        <LocalStorageInput
          className="e2e-config-page-input e2e-config-page-input-dnsJsonResolvers"
          description="A newline delimited list of space delimited key+value pairs for DNS (application/dns-json) resolvers. The key is the domain suffix, and the value is the URL of the DNS resolver."
          localStorageKey={LOCAL_STORAGE_KEYS.config.dnsJsonResolvers}
          label='DNS'
          validationFn={dnsJsonValidationFn}
          defaultValue={convertDnsResolverObjectToInput(defaultDnsJsonResolvers)}
          preSaveFormat={(value) => JSON.stringify(convertDnsResolverInputToObject(value))}
          postLoadFormat={(value) => convertDnsResolverObjectToInput(JSON.parse(value))}
          resetKey={resetKey}
        />

        <LocalStorageInput
          className="e2e-config-page-input"
          description="A string that enables debug logging. Use '*,*:trace' to enable all debug logging."
          localStorageKey={LOCAL_STORAGE_KEYS.config.debug}
          label='Debug'
          validationFn={stringValidationFn}
          defaultValue=''
          resetKey={resetKey}
        />
        <div className="w-100 inline-flex flex-row justify-between">
          <button className="e2e-config-page-button button-reset mr5 pv3 tc bg-animate hover-bg-gold pointer w-30 bn" id="reset-config" onClick={() => { void doResetConfig() }}>Reset Config</button>
          <ServiceWorkerReadyButton className="e2e-config-page-button white w-100 pa3" id="save-config" label='Save Config' waitingLabel='Waiting for service worker registration...' onClick={() => { void saveConfig() }} />
        </div>
        {error != null && <span style={{ color: 'red' }}>{error.message}</span>}
      </Collapsible>
    </main>
    </>
  )
}

export default (): React.JSX.Element => {
  return (
    <ServiceWorkerProvider>
      <ConfigProvider>
        <ConfigPage />
      </ConfigProvider>
    </ServiceWorkerProvider>
  )
}
