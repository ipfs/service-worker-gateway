import React, { useCallback, useContext, useEffect, useState } from 'react'
import { ConfigContext } from '../context/config-context.tsx'
import { ServiceWorkerContext } from '../context/service-worker-context.tsx'
import { HeliaServiceWorkerCommsChannel } from '../lib/channel.ts'
import { getConfig, loadConfigFromLocalStorage } from '../lib/config-db.ts'
import { LOCAL_STORAGE_KEYS } from '../lib/local-storage.ts'
import LocalStorageInput from './local-storage-input.tsx'
import { LocalStorageToggle } from './local-storage-toggle'

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

export default (): JSX.Element | null => {
  const { isConfigExpanded, setConfigExpanded } = useContext(ConfigContext)
  const { isServiceWorkerRegistered } = useContext(ServiceWorkerContext)

  const [error, setError] = useState<Error | null>(null)

  const isLoadedInIframe = window.self !== window.top

  const postFromIframeToParentSw = useCallback(async () => {
    if (!isLoadedInIframe) {
      return
    }
    // we get the iframe origin from a query parameter called 'origin', if this is loaded in an iframe
    const targetOrigin = decodeURIComponent(window.location.search.split('origin=')[1])
    const config = await getConfig()

    /**
     * The reload page in the parent window is listening for this message, and then it passes a RELOAD_CONFIG message to the service worker
     */
    window.parent?.postMessage({ source: 'helia-sw-config-iframe', target: 'PARENT', action: 'RELOAD_CONFIG', config }, {
      targetOrigin
    })
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
      // update the BASE_URL service worker
      channel.postMessage({ target: 'SW', action: 'RELOAD_CONFIG' })
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
  let saveDisabled = true
  const buttonClasses = new Set(['button-reset', 'pv3', 'tc', 'bn', 'white', 'w-100', 'cursor-disabled', 'bg-gray'])
  if (isServiceWorkerRegistered) {
    saveDisabled = false
    buttonClasses.delete('bg-gray')
    buttonClasses.delete('cursor-disabled')
    buttonClasses.add('bg-animate')
    buttonClasses.add('bg-black-80')
    buttonClasses.add('hover-bg-aqua')
    buttonClasses.add('pointer')
  }

  return (
    <main className='pa4-l bg-snow mw7 center pa4'>
      <LocalStorageInput localStorageKey={LOCAL_STORAGE_KEYS.config.gateways} label='Gateways' validationFn={urlValidationFn} />
      <LocalStorageInput localStorageKey={LOCAL_STORAGE_KEYS.config.routers} label='Routers' validationFn={urlValidationFn} />
      <LocalStorageToggle localStorageKey={LOCAL_STORAGE_KEYS.config.autoReload} onLabel='Auto Reload' offLabel='Show Config' />
      <button id="save-config" disabled={saveDisabled} onClick={() => { void saveConfig() }} className={Array.from(buttonClasses).join(' ')}>{saveDisabled ? 'Waiting for service worker registration...' : 'Save Config'}</button>

      {error != null && <span style={{ color: 'red' }}>{error.message}</span>}
    </main>
  )
}
