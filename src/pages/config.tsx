import React, { useCallback, useContext, useEffect, useState } from 'react'
import Header from '../components/Header.jsx'
import { InputSection } from '../components/input-section.jsx'
import { InputToggle } from '../components/input-toggle.jsx'
import NumberInput from '../components/number-input.jsx'
import { ServiceWorkerReadyButton } from '../components/sw-ready-button.jsx'
import TextInput from '../components/textarea-input.jsx'
import { ConfigContext, ConfigProvider } from '../context/config-context.jsx'
import { RouteContext } from '../context/router-context.jsx'
import { ServiceWorkerProvider } from '../context/service-worker-context.jsx'
import { setConfig as storeConfig } from '../lib/config-db.js'
import { convertDnsResolverInputToObject, convertDnsResolverObjectToInput, convertUrlArrayToInput, convertUrlInputToArray } from '../lib/input-helpers.js'
import { isConfigPage } from '../lib/is-config-page.js'
import { getUiComponentLogger, uiLogger } from '../lib/logger.js'
import './default-page-styles.css'
import { isSubdomainGatewayRequest } from '../lib/path-or-subdomain.js'
import { tellSwToReloadConfig } from '../lib/sw-comms.js'
import type { FunctionComponent, ReactElement } from 'react'

const uiComponentLogger = getUiComponentLogger('config-page')
const log = uiLogger.forComponent('config-page')

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

export interface ConfigPageProps extends React.HTMLProps<HTMLElement> {

}

// Config Page can be loaded either as a page or as a component in the landing helper-ui page
const ConfigPage: FunctionComponent<ConfigPageProps> = () => {
  const { gotoPage } = useContext(RouteContext)
  const { setConfig, resetConfig, gateways, routers, dnsJsonResolvers, debug, enableGatewayProviders, enableRecursiveGateways, enableWss, enableWebTransport, fetchTimeout, _supportsSubdomains, isLoading: isConfigDataLoading } = useContext(ConfigContext)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [resetKey, setResetKey] = useState(0)

  const isLoadedInIframe = window.self !== window.top

  const postFromIframeToParentSw = useCallback(async () => {
    if (!isLoadedInIframe) {
      return
    }
    // we get the iframe origin from a query parameter called 'origin', if this is loaded in an iframe
    const targetOrigin = decodeURIComponent(window.location.hash.split('@origin=')[1])
    const config = { gateways, routers, dnsJsonResolvers, debug, enableGatewayProviders, enableRecursiveGateways, enableWss, enableWebTransport, fetchTimeout, _supportsSubdomains }
    log.trace('config-page: postMessage config to origin ', JSON.stringify(config), targetOrigin)
    /**
     * The reload page in the parent window is listening for this message, and then it passes a RELOAD_CONFIG message to the service worker
     */
    window.parent?.postMessage({ source: 'helia-sw-config-iframe', target: 'PARENT', action: 'RELOAD_CONFIG', config }, {
      targetOrigin
    })
    log.trace('config-page: RELOAD_CONFIG sent to parent window')
  }, [gateways, routers, dnsJsonResolvers, debug, enableGatewayProviders, enableRecursiveGateways, enableWss, enableWebTransport, fetchTimeout])

  useEffect(() => {
    if (!isConfigDataLoading) {
      /**
       * On initial load, once the config is done loading from IDB, we want to send the config to the parent window, so that the subdomain registered service worker gets the latest config without user interaction.
       */
      void postFromIframeToParentSw()
    }
  }, [isConfigDataLoading, postFromIframeToParentSw])

  const saveConfig = useCallback(async () => {
    try {
      const config = { gateways, routers, dnsJsonResolvers, debug, enableGatewayProviders, enableRecursiveGateways, enableWss, enableWebTransport, fetchTimeout }
      setIsSaving(true)
      await storeConfig(config, uiComponentLogger)
      log.trace('config-page: sending RELOAD_CONFIG to service worker')
      // update the BASE_URL service worker
      await tellSwToReloadConfig()
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
    } finally {
      setIsSaving(false)
    }
  }, [gateways, routers, dnsJsonResolvers, debug, enableGatewayProviders, enableRecursiveGateways, enableWss, enableWebTransport, fetchTimeout])

  const doResetConfig = useCallback(async () => {
    // we need to clear out the localStorage items and make sure default values are set, and that all of our inputs are updated
    await resetConfig(uiComponentLogger)
    // now reload all the inputs
    setResetKey((prev) => prev + 1)
  }, [])

  let HeaderComponent: ReactElement | null = null
  if (!isLoadedInIframe && !isConfigDataLoading && isConfigPage(window.location.hash) && isSubdomainGatewayRequest(window.location)) {
    HeaderComponent = <Header />
  }

  return (
    <>
      {HeaderComponent}
      <section className='e2e-config-page pa4-l bg-snow mw7 center pa4'>
        <h1 className='pa0 f3 ma0 mb4 teal tc'>Configure your IPFS Gateway</h1>
        <InputSection label='Routing'>
          <TextInput
            className='e2e-config-page-input e2e-config-page-input-routers'
            description='A newline delimited list of delegated IPFS router URLs that expose the /routing/v1 API.'
            label='Delegated Provider, Peer and IPNS Routing'
            validationFn={urlValidationFn}
            onChange={(value) => { setConfig('routers', value) }}
            value={convertUrlArrayToInput(routers)}
            preSaveFormat={(value: string) => value.split('\n')}
            resetKey={resetKey}
          />
          <TextInput
            className='e2e-config-page-input e2e-config-page-input-dnsJsonResolvers'
            description='A newline delimited list of space delimited key+value pairs for DNS (application/dns-json) resolvers. The key is the domain suffix, and the value is the URL of the DNS resolver. Note: Use only trusted DoH resolvers, as they are responsible for DNSLink resolution and may infer related browsing history.'
            label='DNS Resolvers'
            validationFn={dnsJsonValidationFn}
            value={convertDnsResolverObjectToInput(dnsJsonResolvers)}
            onChange={(value) => { setConfig('dnsJsonResolvers', value) }}
            preSaveFormat={(value) => convertDnsResolverInputToObject(value)}
            resetKey={resetKey}
          />
        </InputSection>
        <InputSection label='Direct Retrieval'>
          <InputToggle
            className='e2e-config-page-input e2e-config-page-input-enableGatewayProviders'
            label='Enable Trustless HTTPS Gateway Retrieval'
            description='Fetch verifiable block data (application/vnd.ipld.raw) directly via plain HTTP GET /ipfs/cid?format=raw over HTTPS using Trustless Gateway providers sourced from delegated routers.'
            value={enableGatewayProviders}
            onChange={(value) => { setConfig('enableGatewayProviders', value) }}
            resetKey={resetKey}
          />
          <InputToggle
            className='e2e-config-page-input e2e-config-page-input-enableWss'
            label='Enable Secure WebSocket Retrieval'
            description='Fetch verifiable block data directly via Bitswap over libp2p using Secure WebSocket providers sourced from delegated routers.'
            value={enableWss}
            onChange={(value) => { setConfig('enableWss', value) }}
            resetKey={resetKey}
          />
          <InputToggle
            className='e2e-config-page-input e2e-config-page-input-enableWebTransport'
            label='Enable WebTransport Data Retrieval'
            description='Fetch verifiable block data directly via Bitswap over libp2p using WebTransport providers sourced from delegated routers.'
            value={enableWebTransport}
            onChange={(value) => { setConfig('enableWebTransport', value) }}
            resetKey={resetKey}
          />
        </InputSection>
        <InputSection label='Fallback Retrieval'>
          <InputToggle
            className='e2e-config-page-input e2e-config-page-input-enableRecursiveGateways'
            label='Enable Recursive Gateways'
            description='Attempt to fetch content via centralized recursive gateways, configured below, as a fallback when direct retrieval from storage providers is unavailable due to missing browser-compatible transports.'
            value={enableRecursiveGateways}
            onChange={(value) => { setConfig('enableRecursiveGateways', value) }}
            resetKey={resetKey}
          />
          <TextInput
            className='e2e-config-page-input e2e-config-page-input-gateways'
            description='A newline delimited list of recursive trustless gateway URLs. Note: Use only trusted centralized gateways, as they may log and correlate your entire browsing history.'
            label='Recursive Gateways'
            validationFn={urlValidationFn}
            value={convertUrlArrayToInput(gateways)}
            onChange={(value) => { setConfig('gateways', value) }}
            preSaveFormat={(value: string) => value.split('\n')}
            resetKey={resetKey}
          />
        </InputSection>
        <InputSection label='Other'>
          <NumberInput
            className='e2e-config-page-input e2e-config-page-input-fetchTimeout'
            description='The timeout for fetching content from the gateway, in seconds'
            label='Fetch Timeout'
            value={fetchTimeout / 1000}
            validationFn={(value) => {
              if (value < 0.1) {
                return new Error('Fetch timeout must be at least 0.1 seconds')
              }
              return null
            }}
            preSaveFormat={(value) => value * 1000}
            onChange={(value) => { setConfig('fetchTimeout', value) }}
            resetKey={resetKey}
          />
          <TextInput
            className='e2e-config-page-input e2e-config-page-input-debug'
            description="A string that enables debug logging. Use '*,*:trace' to enable all debug logging."
            label='Debug'
            value={debug}
            onChange={(value) => { setConfig('debug', value) }}
            resetKey={resetKey}
          />
        </InputSection>
        <div className='w-100 inline-flex flex-row justify-between'>
          <ServiceWorkerReadyButton
            className='e2e-config-page-button pv3 tc bg-animate hover-bg-red-muted pointer w-30 bn'
            id='unregister-sw'
            label='Reset Worker'
            waitingLabel='Waiting for SW...'
            onClick={() => {
              const currentUrl = new URL(window.location.href)
              currentUrl.searchParams.set('ipfs-sw-unregister', 'true')
              window.location.href = currentUrl.href
            }}
            disabled={isSaving}
          />
          <button className='e2e-config-page-button button-reset pv3 tc bg-animate hover-bg-gold pointer w-30 bn mr5' id='reset-config' onClick={() => { void doResetConfig() }}>Reset Config</button>
          <ServiceWorkerReadyButton className='e2e-config-page-button white w-100 pa3 bg-animate bg-teal-muted hover-bg-navy-muted' id='save-config' label={isSaving ? 'Saving...' : 'Save Config'} waitingLabel='Waiting for service worker registration...' onClick={() => { void saveConfig() }} disabled={isSaving} />
        </div>
        {error != null && <span style={{ color: 'red' }}>{error.message}</span>}
      </section>
    </>
  )
}

export default (): ReactElement => {
  return (
    <ServiceWorkerProvider>
      <ConfigProvider>
        <ConfigPage />
      </ConfigProvider>
    </ServiceWorkerProvider>
  )
}
