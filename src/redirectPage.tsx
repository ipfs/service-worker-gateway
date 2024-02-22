import React, { useEffect, useMemo } from 'react'
import { ServiceWorkerContext } from './context/service-worker-context.tsx'
import { HeliaServiceWorkerCommsChannel } from './lib/channel.ts'
import { setConfig, type ConfigDb } from './lib/config-db.ts'
import { BASE_URL } from './lib/webpack-constants.ts'

const ConfigIframe = (): JSX.Element => {
  const iframeSrc = `${window.location.protocol}//${BASE_URL}/config?origin=${encodeURIComponent(window.location.origin)}`

  return (
    <iframe id="redirect-config-iframe" src={iframeSrc} style={{ width: '100vw', height: '100vh', border: 'none' }} />
  )
}

const channel = new HeliaServiceWorkerCommsChannel('WINDOW')

export default function RedirectPage (): JSX.Element {
  const [isAutoReloadEnabled, setIsAutoReloadEnabled] = React.useState(false)
  const { isServiceWorkerRegistered } = React.useContext(ServiceWorkerContext)

  useEffect(() => {
    const listener = (event: MessageEvent): void => {
      if (event.data?.source === 'helia-sw-config-iframe') {
        const config = event.data?.config as ConfigDb | null
        if (config != null) {
          void setConfig(config).then(() => {
            channel.postMessage({ target: 'SW', action: 'RELOAD_CONFIG' })
          }).catch((err) => {
            // eslint-disable-next-line no-console
            console.error('config-debug: error setting config on subdomain', err)
          })
          if (config.autoReload) {
            setIsAutoReloadEnabled(config.autoReload)
          }
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
