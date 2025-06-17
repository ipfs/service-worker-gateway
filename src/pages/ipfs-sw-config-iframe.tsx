/**
 * This page is used to load the config from the root domain, and then send it to the subdomain service worker.
 *
 * 1. it sents a GET request to the root domain service worker to get the config
 * 2. it posts a message to the root domain service worker with that config
 * 3. the root domain service worker will then send a RELOAD_CONFIG message to the subdomain service worker
 * 4. the subdomain service worker will then reload the config
 *
 * TODO: Migrate to native .html page that doesn't require react or other dependencies at all.
 */
import React, { useContext, useEffect } from 'react'
import { ServiceWorkerContext, ServiceWorkerProvider } from '../context/service-worker-context.jsx'
import { uiLogger } from '../lib/logger.js'
import type { ReactElement } from 'react'

const log = uiLogger.forComponent('ipfs-sw-config-iframe')

const ConfigIframe: React.FC = () => {
  const targetOrigin = decodeURIComponent(window.location.hash.split('@origin=')[1])
  const { isServiceWorkerRegistered } = useContext(ServiceWorkerContext)

  useEffect(() => {
    if (isServiceWorkerRegistered) {
      async function doWork (): Promise<void> {
        const configResponse = await fetch('?ipfs-sw-config-get=true')
        const config = await configResponse.json()
        // this is listened to by the redirect-page.tsx
        window.parent?.postMessage({ source: 'helia-sw-config-iframe', target: 'PARENT', action: 'RELOAD_CONFIG', config }, {
          targetOrigin
        })
        log.trace('config-page: RELOAD_CONFIG sent to parent window')
      }
      void doWork()
    }
  }, [isServiceWorkerRegistered])

  return <></>
}

export default (): ReactElement => {
  return (
    <ServiceWorkerProvider>
      <ConfigIframe />
    </ServiceWorkerProvider>
  )
}
