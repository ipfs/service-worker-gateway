import React, { useEffect } from 'react'
import { HeliaServiceWorkerCommsChannel } from './lib/channel.ts'
import { setConfig } from './lib/config-db.ts'
import { BASE_URL } from './lib/webpack-constants.ts'

const ConfigIframe = (): JSX.Element => {
  const iframeSrc = `${window.location.protocol}//${BASE_URL}/config?origin=${encodeURIComponent(window.location.origin)}`

  return (
    <iframe id="redirect-config-iframe" src={iframeSrc} style={{ width: '100vw', height: '100vh', border: 'none' }} />
  )
}

const channel = new HeliaServiceWorkerCommsChannel('WINDOW')

export default function RedirectPage (): JSX.Element {
  useEffect(() => {
    const listener = (event: MessageEvent): void => {
      if (event.data?.source === 'helia-sw-config-iframe') {
        const config = event.data?.config
        if (config != null) {
          void setConfig(config).then(() => {
            channel.postMessage({ target: 'SW', action: 'RELOAD_CONFIG' })
          }).catch((err) => {
            // eslint-disable-next-line no-console
            console.error('config-debug: error setting config on subdomain', err)
          })
        }
      }
    }
    window.addEventListener('message', listener)
    return () => {
      window.removeEventListener('message', listener)
    }
  }, [])

  return (
    <div className="redirect-page">
      <h1>Registering Helia service worker and reloading...</h1>
      <ConfigIframe />
    </div>
  )
}
