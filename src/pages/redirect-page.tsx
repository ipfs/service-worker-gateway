import React, { useContext, useEffect, useMemo, useState } from 'preact/compat'
import { ServiceWorkerReadyButton } from '../components/sw-ready-button.jsx'
import { ServiceWorkerContext } from '../context/service-worker-context.jsx'
import { HeliaServiceWorkerCommsChannel } from '../lib/channel.js'
import { setConfig, type ConfigDb } from '../lib/config-db.js'
import { getSubdomainParts } from '../lib/get-subdomain-parts.js'
import { isConfigPage } from '../lib/is-config-page.js'
import { error, trace } from '../lib/logger.js'

const ConfigIframe = (): React.JSX.Element => {
  const { parentDomain } = getSubdomainParts(window.location.href)
  let iframeSrc
  if (parentDomain == null || parentDomain === window.location.href) {
    const url = new URL(window.location.href)
    url.pathname = '/'
    url.hash = `#/ipfs-sw-config@origin=${encodeURIComponent(window.location.origin)}`
    iframeSrc = url.href
  } else {
    const portString = window.location.port === '' ? '' : `:${window.location.port}`
    iframeSrc = `${window.location.protocol}//${parentDomain}${portString}/#/ipfs-sw-config@origin=${encodeURIComponent(window.location.origin)}`
  }

  return (
    <iframe id="redirect-config-iframe" src={iframeSrc} style={{ width: '100vw', height: '100vh', border: 'none' }} />
  )
}

const channel = new HeliaServiceWorkerCommsChannel('WINDOW')

export default function RedirectPage ({ showConfigIframe = true }: { showConfigIframe?: boolean }): React.JSX.Element {
  const [isAutoReloadEnabled, setIsAutoReloadEnabled] = useState(false)
  const { isServiceWorkerRegistered } = useContext(ServiceWorkerContext)

  useEffect(() => {
    async function doWork (config: ConfigDb): Promise<void> {
      try {
        await setConfig(config)
        // TODO: show spinner / disable buttons while waiting for response
        await channel.messageAndWaitForResponse('SW', { target: 'SW', action: 'RELOAD_CONFIG' })
        trace('redirect-page: RELOAD_CONFIG_SUCCESS on %s', window.location.origin)
        // try to preload the content
        // await fetch(window.location.href, { method: 'GET' })
      } catch (err) {
        error('redirect-page: error setting config on subdomain', err)
      }

      if (config.autoReload) {
        setIsAutoReloadEnabled(config.autoReload)
      }
    }
    const listener = (event: MessageEvent): void => {
      if (event.data?.source === 'helia-sw-config-iframe') {
        trace('redirect-page: received RELOAD_CONFIG message from iframe', event.data)
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

  let reloadUrl = window.location.href
  if (isConfigPage(window.location.hash)) {
    reloadUrl = window.location.href.replace('#/ipfs-sw-config', '')
  }

  const displayString = useMemo(() => {
    if (!isServiceWorkerRegistered) {
      return 'Registering Helia service worker...'
    }
    if (isAutoReloadEnabled && !isConfigPage(window.location.hash)) {
      return 'Redirecting you because Auto Reload is enabled.'
    }

    return 'Please save your changes to the config to apply them. You can then refresh the page to load your content.'
  }, [isAutoReloadEnabled, isServiceWorkerRegistered])

  useEffect(() => {
    if (isAutoReloadEnabled && isServiceWorkerRegistered && !isConfigPage(window.location.hash)) {
      window.location.reload()
    }
  }, [isAutoReloadEnabled, isServiceWorkerRegistered])

  return (
    <div className="redirect-page">
      <div className="pa4-l mw7 mv5 center pa4">
        <h3 className="">{displayString}</h3>
        <ServiceWorkerReadyButton id="load-content" label='Load content' waitingLabel='Waiting for service worker registration...' onClick={() => { window.location.href = reloadUrl }} />
      </div>
      {showConfigIframe && <ConfigIframe />}
    </div>
  )
}
