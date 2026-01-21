import React, { useCallback, useContext, useState } from 'react'
import { defaultDebug, defaultDnsJsonResolvers, defaultEnableGatewayProviders, defaultEnableRecursiveGateways, defaultEnableWebTransport, defaultEnableWss, defaultFetchTimeout, defaultGateways, defaultRenderHTMLViews, defaultRouters, defaultServiceWorkerRegistrationTTL, defaultSupportDirectoryIndexes, defaultSupportWebRedirects } from '../../lib/config-db.js'
import { QUERY_PARAMS } from '../../lib/constants.js'
import { convertDnsResolverInputToObject, convertDnsResolverObjectToInput, convertUrlArrayToInput, convertUrlInputToArray } from '../../lib/input-helpers.js'
import { uiLogger } from '../../lib/logger.js'
import { tellSwToReloadConfig } from '../../lib/sw-comms.js'
import { InputSection } from '../components/input-section.jsx'
import { InputToggle } from '../components/input-toggle.jsx'
import NumberInput from '../components/number-input.jsx'
import { ServiceWorkerReadyButton } from '../components/sw-ready-button.jsx'
import TextInput from '../components/textarea-input.jsx'
import { ConfigContext } from '../context/config-context.jsx'
import './default-page-styles.css'
import type { FunctionComponent, ReactElement } from 'react'

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
 * Converts newline delimited patterns of space delimited key+value pairs to a
 * JSON object, and validates each URL.
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

// Config Page can be loaded either as a page or as a component in the landing
// helper-ui page
const ConfigPage: FunctionComponent = () => {
  const configContext = useContext(ConfigContext)

  const [gateways, setGateways] = useState<string[]>(configContext.configDb?.gateways ?? defaultGateways)
  const [routers, setRouters] = useState<string[]>(configContext.configDb?.routers ?? defaultRouters)
  const [dnsJsonResolvers, setDnsJsonResolvers] = useState<Record<string, string>>(configContext.configDb?.dnsJsonResolvers ?? defaultDnsJsonResolvers)
  const [enableWss, setEnableWss] = useState(configContext.configDb?.enableWss ?? defaultEnableWss)
  const [enableWebTransport, setEnableWebTransport] = useState(configContext.configDb?.enableWebTransport ?? defaultEnableWebTransport)
  const [enableGatewayProviders, setEnableGatewayProviders] = useState(configContext.configDb?.enableGatewayProviders ?? defaultEnableGatewayProviders)
  const [enableRecursiveGateways, setEnableRecursiveGateways] = useState(configContext.configDb?.enableRecursiveGateways ?? defaultEnableRecursiveGateways)
  const [debug, setDebug] = useState(configContext.configDb?.debug ?? defaultDebug())
  const [fetchTimeout, setFetchTimeout] = useState(configContext.configDb?.fetchTimeout ?? defaultFetchTimeout)
  const [serviceWorkerRegistrationTTL, setServiceWorkerRegistrationTTL] = useState(configContext.configDb?.serviceWorkerRegistrationTTL ?? defaultServiceWorkerRegistrationTTL)
  const [supportDirectoryIndexes, setSupportDirectoryIndexes] = useState(configContext.configDb?.supportDirectoryIndexes ?? defaultSupportDirectoryIndexes)
  const [supportWebRedirects, setSupportWebRedirects] = useState(configContext.configDb?.supportWebRedirects ?? defaultSupportWebRedirects)
  const [renderHTMLViews, setRenderHTMLViews] = useState(configContext.configDb?.renderHTMLViews ?? defaultRenderHTMLViews)

  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [resetKey, setResetKey] = useState(0)

  const saveConfig = useCallback(async () => {
    try {
      setIsSaving(true)

      await configContext.saveConfig({
        gateways,
        routers,
        dnsJsonResolvers,
        debug,
        enableGatewayProviders,
        enableRecursiveGateways,
        enableWss,
        enableWebTransport,
        fetchTimeout,
        serviceWorkerRegistrationTTL,
        supportDirectoryIndexes,
        supportWebRedirects,
        renderHTMLViews
      })

      log.trace('config-page: sending RELOAD_CONFIG to service worker')
      // update the BASE_URL service worker
      await tellSwToReloadConfig()
      // base_domain service worker is updated
      log.trace('config-page: RELOAD_CONFIG_SUCCESS for %s', window.location.origin)
    } catch (err) {
      log.error('error saving config - %e', err)
      setError(err as Error)
    } finally {
      setIsSaving(false)
    }
  }, [
    gateways,
    routers,
    dnsJsonResolvers,
    debug,
    enableGatewayProviders,
    enableRecursiveGateways,
    enableWss,
    enableWebTransport,
    fetchTimeout,
    serviceWorkerRegistrationTTL,
    supportDirectoryIndexes,
    supportWebRedirects,
    renderHTMLViews
  ])

  const doResetConfig = useCallback(async () => {
    try {
      setIsSaving(true)

      // we need to clear out the localStorage items and make sure default
      // values are set, and that all of our inputs are updated
      await configContext.resetConfig()

      // reset values
      // TODO: updating the context should do this automatically?
      setGateways(configContext.configDb.gateways)
      setRouters(configContext.configDb.routers)
      setDnsJsonResolvers(configContext.configDb.dnsJsonResolvers)
      setEnableWss(configContext.configDb.enableWss)
      setEnableWebTransport(configContext.configDb.enableWebTransport)
      setEnableGatewayProviders(configContext.configDb.enableGatewayProviders)
      setEnableRecursiveGateways(configContext.configDb.enableRecursiveGateways)
      setDebug(configContext.configDb.debug)
      setFetchTimeout(configContext.configDb.fetchTimeout)
      setServiceWorkerRegistrationTTL(configContext.configDb.serviceWorkerRegistrationTTL)
      setSupportDirectoryIndexes(configContext.configDb.supportDirectoryIndexes)
      setSupportWebRedirects(configContext.configDb.supportWebRedirects)
      setRenderHTMLViews(configContext.configDb.renderHTMLViews)

      // now reload all the inputs
      setResetKey((prev) => prev + 1)
    } catch (err) {
      log.error('error saving config - %e', err)
      setError(err as Error)
    } finally {
      setIsSaving(false)
    }
  }, [
    gateways,
    routers,
    dnsJsonResolvers,
    debug,
    enableGatewayProviders,
    enableRecursiveGateways,
    enableWss,
    enableWebTransport,
    fetchTimeout,
    serviceWorkerRegistrationTTL,
    supportDirectoryIndexes,
    supportWebRedirects,
    renderHTMLViews
  ])

  return (
    <>
      <section className='e2e-config-page pa4-l bg-snow mw7 mv4-l center pa4 br2'>
        <h1 className='pa0 f3 ma0 mb4 teal tc'>Configure your IPFS Gateway</h1>
        <InputSection label='Routing'>
          <TextInput
            className='e2e-config-page-input e2e-config-page-input-routers'
            description='A newline delimited list of delegated IPFS router URLs that expose the /routing/v1 API'
            label='Delegated Provider, Peer and IPNS Routing'
            validationFn={urlValidationFn}
            // @ts-expect-error value is transformed by preSaveFormat
            onChange={setRouters}
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
            // @ts-expect-error value is transformed by preSaveFormat
            onChange={setDnsJsonResolvers}
            preSaveFormat={convertDnsResolverInputToObject}
            resetKey={resetKey}
          />
        </InputSection>
        <InputSection label='Direct Retrieval'>
          <InputToggle
            className='e2e-config-page-input e2e-config-page-input-enableGatewayProviders'
            label='Enable Trustless HTTPS Gateway Retrieval'
            description='Fetch verifiable block data (application/vnd.ipld.raw) directly via plain HTTP GET /ipfs/cid?format=raw over HTTPS using Trustless Gateway providers sourced from delegated routers'
            value={enableGatewayProviders}
            onChange={setEnableGatewayProviders}
            resetKey={resetKey}
          />
          <InputToggle
            className='e2e-config-page-input e2e-config-page-input-enableWss'
            label='Enable Secure WebSocket Retrieval'
            description='Fetch verifiable block data directly via Bitswap over libp2p using Secure WebSocket providers sourced from delegated routers'
            value={enableWss}
            onChange={setEnableWss}
            resetKey={resetKey}
          />
          <InputToggle
            className='e2e-config-page-input e2e-config-page-input-enableWebTransport'
            label='Enable WebTransport Data Retrieval'
            description='Fetch verifiable block data directly via Bitswap over libp2p using WebTransport providers sourced from delegated routers'
            value={enableWebTransport}
            onChange={setEnableWebTransport}
            resetKey={resetKey}
          />
        </InputSection>
        <InputSection label='Fallback Retrieval'>
          <InputToggle
            className='e2e-config-page-input e2e-config-page-input-enableRecursiveGateways'
            label='Enable Recursive Gateways'
            description='Attempt to fetch content via centralized recursive gateways, configured below, as a fallback when direct retrieval from storage providers is unavailable due to missing browser-compatible transports'
            value={enableRecursiveGateways}
            onChange={setEnableRecursiveGateways}
            resetKey={resetKey}
          />
          <TextInput
            className='e2e-config-page-input e2e-config-page-input-gateways'
            description='A newline delimited list of recursive trustless gateway URLs. Note: Use only trusted centralized gateways, as they may log and correlate your entire browsing history'
            label='Recursive Gateways'
            validationFn={urlValidationFn}
            value={convertUrlArrayToInput(gateways)}
            // @ts-expect-error value is transformed by preSaveFormat
            onChange={setGateways}
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
            onChange={setFetchTimeout}
            resetKey={resetKey}
          />
          <NumberInput
            className='e2e-config-page-input e2e-config-page-input-serviceWorkerRegistrationTTL'
            description='The time for the service worker registration to last, in hours, prior to triggering an explicit unregister event'
            label='Service Worker Registration TTL'
            value={serviceWorkerRegistrationTTL / 1000 / 60 / 60}
            validationFn={(value) => {
              if (value < 0.01) {
                return new Error('Service worker registration TTL must be at least 0.01 hours')
              }
              return null
            }}
            preSaveFormat={(value) => value * 1000 * 60 * 60}
            onChange={setServiceWorkerRegistrationTTL}
            resetKey={resetKey}
          />
          <InputToggle
            className='e2e-config-page-input e2e-config-page-input-supportDirectoryIndexes'
            label='Support directory indexes'
            description='When a directory is loaded, render any index.html file present instead of a directory listing'
            value={supportDirectoryIndexes}
            onChange={setSupportDirectoryIndexes}
            resetKey={resetKey}
          />
          <InputToggle
            className='e2e-config-page-input e2e-config-page-input-supportWebRedirects'
            label='Support web redirects'
            description='When a _redirects file is present at the root of a DAG, use it to override paths within that DAG'
            value={supportWebRedirects}
            onChange={setSupportWebRedirects}
            resetKey={resetKey}
          />
          <InputToggle
            className='e2e-config-page-input e2e-config-page-input-renderHTMLViews'
            label='Render HTML views'
            description='For content such as JSON, DAG-CBOR or raw, show an HTML page that allows inspecting properties, traversing to other blocks, etc'
            value={renderHTMLViews}
            onChange={setRenderHTMLViews}
            resetKey={resetKey}
          />
          <TextInput
            className='e2e-config-page-input e2e-config-page-input-debug'
            description="A string that enables debug logging. Use '*,*:trace' to enable all debug logging"
            label='Debug'
            value={debug}
            onChange={setDebug}
            resetKey={resetKey}
          />
        </InputSection>
        <div className='w-100 inline-flex flex-row justify-between'>
          <button className='e2e-config-page-button button-reset pv3 tc bg-animate hover-bg-gold pointer w-30 bn mr5' id='reset-config' onClick={() => { void doResetConfig() }}>Reset Config</button>
          <ServiceWorkerReadyButton className='e2e-config-page-button white w-100 pa3 bg-animate bg-teal-muted hover-bg-navy-muted' id='save-config' label={isSaving ? 'Saving...' : 'Save Config'} waitingLabel='Waiting for service worker registration...' onClick={saveConfig} disabled={isSaving} />
        </div>
        {error != null && <span style={{ color: 'red' }}>{error.message}</span>}
        <ServiceWorkerReadyButton
          className='e2e-config-page-button pv3 tc bg-animate hover-bg-red-muted pointer w-100 bn mt3'
          id='unregister-sw'
          label='Uninstall Service Worker'
          waitingLabel='Waiting for SW...'
          onClick={() => {
            const currentUrl = new URL(window.location.href)
            currentUrl.searchParams.set(QUERY_PARAMS.UNREGISTER_SERVICE_WORKER, 'true')
            window.location.href = currentUrl.href
          }}
          disabled={isSaving}
        />
      </section>
    </>
  )
}

export default (): ReactElement => {
  return (
    <ConfigPage />
  )
}
