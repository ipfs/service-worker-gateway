import React, { useContext, useEffect, useMemo, useState } from 'react'
import { ServiceWorkerContext } from './context/service-worker-context.tsx'
import { HeliaServiceWorkerCommsChannel } from './lib/channel.ts'
import { setConfig, type ConfigDb } from './lib/config-db.ts'
import { error } from './lib/logger.ts'

const ConfigIframe = (): JSX.Element => {
  const iframeSrc = `${window.location.origin}/config?origin=${encodeURIComponent(window.location.origin)}`

  return (
    <iframe id="redirect-config-iframe" src={iframeSrc} style={{ width: '100vw', height: '100vh', border: 'none' }} />
  )
}

const channel = new HeliaServiceWorkerCommsChannel('WINDOW')

export default function RedirectPage (): JSX.Element {
  const [isAutoReloadEnabled, setIsAutoReloadEnabled] = useState(false)
  const { isServiceWorkerRegistered } = useContext(ServiceWorkerContext)

  useEffect(() => {
    async function doWork (config: ConfigDb): Promise<void> {
      try {
        await setConfig(config)
        // TODO: use channel.messageAndWaitForResponse to ensure that the config is loaded before proceeding.
        channel.postMessage({ target: 'SW', action: 'RELOAD_CONFIG' })
        // try to preload the content
        setTimeout(() => {
          fetch(window.location.href, { method: 'GET' }).then((response) => {
            // eslint-disable-next-line no-console
            console.log('response', response)
          }).catch((err) => {
            // eslint-disable-next-line no-console
            console.error('error fetching', err)
          })
        }, 500)
      } catch (err) {
        error('config-debug: error setting config on subdomain', err)
      }

      if (config.autoReload) {
        setIsAutoReloadEnabled(config.autoReload)
      }
    }
    const listener = (event: MessageEvent): void => {
      if (event.data?.source === 'helia-sw-config-iframe') {
        const config = event.data?.config
        if (config != null) {
          void doWork(config as ConfigDb)
        }
      }
    }
    window.addEventListener('message', listener)
    return () => {
      window.removeEventListener('message', listener)
    }
  }, [])

  const displayString = useMemo(() => {
    if (!isServiceWorkerRegistered) {
      return 'Registering Helia service worker...'
    }
    if (isAutoReloadEnabled) {
      return 'Redirecting you because Auto Reload is enabled.'
    }

    return 'Please save your changes to the config to apply them. You can then refresh the page to load your content.'
  }, [isAutoReloadEnabled, isServiceWorkerRegistered])

  useEffect(() => {
    if (isAutoReloadEnabled && isServiceWorkerRegistered) {
      window.location.reload()
    }
  }, [isAutoReloadEnabled, isServiceWorkerRegistered])

  return (
    <div className="redirect-page">
      <h1 className="pa4-l mw7 mv5 center pa4">{displayString}</h1>
      <ConfigIframe />
    </div>
  )
}
