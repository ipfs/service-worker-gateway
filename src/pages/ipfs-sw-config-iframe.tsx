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
import React, { useContext, useEffect, useState } from 'react'
import { ServiceWorkerContext, ServiceWorkerProvider } from '../context/service-worker-context.jsx'
import { uiLogger } from '../lib/logger.js'
import type { ReactElement } from 'react'
import type { ConfigDb } from '../lib/config-db.js'
import { getConfig } from '../lib/config-db.js'

const log = uiLogger.forComponent('ipfs-sw-config-iframe')
const INITIAL_DELAY_MS = 1000

const ConfigIframe: React.FC = () => {
  const targetOrigin = decodeURIComponent(window.location.hash.split('@origin=')[1] || '')
  const { isServiceWorkerRegistered } = useContext(ServiceWorkerContext)
  const [config, setConfig] = useState<ConfigDb | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [hasStorageAccess, setHasStorageAccess] = useState(false)
  const [configFromIdb, setConfigFromIdb] = useState<ConfigDb | null>(null)

  // the URL of the iframe (parent domain name)
  const iframeUrl = window.location.href.split('?')[0]
  const iframeOrigin = new URL(iframeUrl).origin
  const iframeHostname = new URL(iframeUrl).hostname

  useEffect(() => {
    void document.hasStorageAccess()
      .then(async (hasAccess) => {
        await setHasStorageAccess(hasAccess)
        if (!hasAccess) {
          return document.requestStorageAccess()
        }
      }).catch((err) => {
        log.error('error checking storage access', err)
      })
    // }
  }, [])

  useEffect(() => {
    // only run if SW is up and we haven’t got config yet
    if (!isServiceWorkerRegistered || config !== null) return

    const controller = new AbortController()
    const delayMs = INITIAL_DELAY_MS * 2 ** attempts
    const timeoutId = window.setTimeout(async () => {
      try {
        log.trace('config-iframe: fetching config')
        const res = await fetch(`${iframeOrigin}?ipfs-sw-config-get=true`, { signal: controller.signal, headers: {
          'mode': 'cors',
          'Cache-Control': 'no-cache'
        } })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as ConfigDb
        log.trace('config-iframe: config fetched', json)
        setConfig(json)
      } catch (err) {
        log.error(`Failed to fetch config (attempt ${attempts + 1})`, err)
        setAttempts((n) => n + 1)
      }
    }, delayMs)

    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [isServiceWorkerRegistered, config, attempts])

  useEffect(() => {
    // get the config from indexedDB directly
    void getConfig(uiLogger).then((config) => {
      setConfigFromIdb(config)
    })
  }, [])

  // useEffect(() => {
  //   if (config !== null) {
  //     window.parent?.postMessage(
  //       { source: 'helia-sw-config-iframe', target: 'PARENT', action: 'RELOAD_CONFIG', config },
  //       { targetOrigin }
  //     )
  //     log.trace('config-page: RELOAD_CONFIG sent to parent window')
  //   }
  // }, [config, targetOrigin])

  return <div>
    <button onClick={() => {
        window.parent?.postMessage(
          { source: 'helia-sw-config-iframe', target: 'PARENT', action: 'RELOAD_CONFIG', config },
          { targetOrigin }
        )
      log.trace('config-page: RELOAD_CONFIG sent to parent window')
    }}>Send config to parent</button>
    <h1>Iframe details: </h1><pre>{JSON.stringify({ iframeOrigin, iframeHostname, iframeUrl }, null, 2)}</pre>
    <h1>Has storage access:</h1>
    <pre>{JSON.stringify(hasStorageAccess, null, 2)}</pre>
    <h1>Loaded config from service worker:</h1>
    <pre>{JSON.stringify(config, null, 2)}</pre>
    <h1>Loaded config from indexedDB:</h1>
    <pre>{JSON.stringify(configFromIdb, null, 2)}</pre>
    <h1>Attempts:</h1>
    <pre>{attempts}</pre>
  </div>
}

export default (): ReactElement => {
  return (
    <ServiceWorkerProvider>
      <ConfigIframe />
    </ServiceWorkerProvider>
  )
}
