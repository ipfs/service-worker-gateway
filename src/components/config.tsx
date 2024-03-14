import React, { useCallback, useContext, useEffect, useState } from 'react'
import { ConfigContext } from '../context/config-context.tsx'
import { HeliaServiceWorkerCommsChannel } from '../lib/channel.ts'
import { getConfig, loadConfigFromLocalStorage } from '../lib/config-db.ts'
import { LOCAL_STORAGE_KEYS } from '../lib/local-storage.ts'
import { trace } from '../lib/logger.ts'
import { Collapsible } from './collapsible.tsx'
import LocalStorageInput from './local-storage-input.tsx'
import { LocalStorageToggle } from './local-storage-toggle'
import { ServiceWorkerReadyButton } from './sw-ready-button.tsx'

const channel = new HeliaServiceWorkerCommsChannel('WINDOW')

const urlValidationFn = (value: string): Error | null => {
  try {
    const urls = JSON.parse(value) satisfies string[]
    let i = 0
    try {
      urls.map((url, index) => {
        i = index
        return new URL(url)
      })
    } catch (e) {
      throw new Error(`URL "${urls[i]}" at index ${i} is not valid`)
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

export default (): JSX.Element | null => {
  const { isConfigExpanded, setConfigExpanded } = useContext(ConfigContext)
  const [error, setError] = useState<Error | null>(null)

  const isLoadedInIframe = window.self !== window.top

  const postFromIframeToParentSw = useCallback(async () => {
    if (!isLoadedInIframe) {
      return
    }
    // we get the iframe origin from a query parameter called 'origin', if this is loaded in an iframe
    const targetOrigin = decodeURIComponent(window.location.hash.split('@origin=')[1])
    const config = await getConfig()
    trace('config-page: postMessage config to origin ', config, origin)
    /**
     * The reload page in the parent window is listening for this message, and then it passes a RELOAD_CONFIG message to the service worker
     */
    window.parent?.postMessage({ source: 'helia-sw-config-iframe', target: 'PARENT', action: 'RELOAD_CONFIG', config }, {
      targetOrigin
    })
    trace('config-page: RELOAD_CONFIG sent to parent window')
  }, [])

  useEffect(() => {
    /**
     * On initial load, we want to send the config to the parent window, so that the reload page can auto-reload if enabled, and the subdomain registered service worker gets the latest config without user interaction.
     */
    void postFromIframeToParentSw()
  }, [])

  const saveConfig = useCallback(async () => {
    try {
      await loadConfigFromLocalStorage()
      trace('config-page: sending RELOAD_CONFIG to service worker')
      // update the BASE_URL service worker
      await channel.messageAndWaitForResponse('SW', { target: 'SW', action: 'RELOAD_CONFIG' })
      // base_domain service worker is updated
      trace('config-page: RELOAD_CONFIG_SUCCESS for %s', window.location.origin)
      // update the <subdomain>.<namespace>.BASE_URL service worker
      await postFromIframeToParentSw()
      setConfigExpanded(false)
    } catch (err) {
      setError(err as Error)
    }
  }, [])

  if (!isConfigExpanded) {
    return null
  }

  const isInIframe = window.self !== window.top

  return (
    <main className='pa4-l bg-snow mw7 center pa4'>
      <Collapsible collapsedLabel="View config" expandedLabel='Hide config' collapsed={isInIframe}>
        <LocalStorageInput localStorageKey={LOCAL_STORAGE_KEYS.config.gateways} label='Gateways' validationFn={urlValidationFn} defaultValue='[]' />
        <LocalStorageInput localStorageKey={LOCAL_STORAGE_KEYS.config.routers} label='Routers' validationFn={urlValidationFn} defaultValue='[]'/>
        <LocalStorageToggle localStorageKey={LOCAL_STORAGE_KEYS.config.autoReload} onLabel='Auto Reload' offLabel='Show Config' />
        <LocalStorageInput localStorageKey={LOCAL_STORAGE_KEYS.config.debug} label='Debug logging' validationFn={stringValidationFn} defaultValue=''/>
        <ServiceWorkerReadyButton id="save-config" label='Save Config' waitingLabel='Waiting for service worker registration...' onClick={() => { void saveConfig() }} />

        {error != null && <span style={{ color: 'red' }}>{error.message}</span>}
      </Collapsible>
    </main>
  )
}
