import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import Header from '../components/Header.jsx'
import { ServiceWorkerReadyButton } from '../components/sw-ready-button.jsx'
import { ConfigProvider } from '../context/config-context.jsx'
import { ServiceWorkerContext, ServiceWorkerProvider } from '../context/service-worker-context.jsx'
import { HeliaServiceWorkerCommsChannel } from '../lib/channel.js'
import { setConfig, type ConfigDb } from '../lib/config-db.js'
import { getSubdomainParts } from '../lib/get-subdomain-parts.js'
import { isConfigPage } from '../lib/is-config-page.js'
import { getUiComponentLogger, uiLogger } from '../lib/logger.js'
import { translateIpfsRedirectUrl } from '../lib/translate-ipfs-redirect-url.js'
import './default-page-styles.css'
import LoadingPage from './loading.jsx'

const uiComponentLogger = getUiComponentLogger('redirect-page')
const log = uiLogger.forComponent('redirect-page')

const ConfigIframe = (): JSX.Element => {
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

const channel = new HeliaServiceWorkerCommsChannel('WINDOW', uiComponentLogger)

function RedirectPage ({ showConfigIframe = true }: { showConfigIframe?: boolean }): React.JSX.Element {
  const [isAutoReloadEnabled, setIsAutoReloadEnabled] = useState(false)
  const { isServiceWorkerRegistered } = useContext(ServiceWorkerContext)
  const [reloadUrl, setReloadUrl] = useState(translateIpfsRedirectUrl(window.location.href).href)
  const [isLoadingContent, setIsLoadingContent] = useState(false)

  useEffect(() => {
    if (isConfigPage(window.location.hash)) {
      setReloadUrl(window.location.href.replace('#/ipfs-sw-config', ''))
    }

    async function doWork (config: ConfigDb): Promise<void> {
      try {
        await setConfig(config, uiComponentLogger)
        // TODO: show spinner / disable buttons while waiting for response
        await channel.messageAndWaitForResponse('SW', { target: 'SW', action: 'RELOAD_CONFIG' })
        log.trace('redirect-page: RELOAD_CONFIG_SUCCESS on %s', window.location.origin)
        // try to preload the content
        // await fetch(window.location.href, { method: 'GET' })
      } catch (err) {
        log.error('redirect-page: error setting config on subdomain', err)
      }

      if (config.autoReload) {
        setIsAutoReloadEnabled(config.autoReload)
      }
    }
    const listener = (event: MessageEvent): void => {
      if (event.data?.source === 'helia-sw-config-iframe') {
        log.trace('redirect-page: received RELOAD_CONFIG message from iframe', event.data)
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
    if (isAutoReloadEnabled && !isConfigPage(window.location.hash)) {
      return 'Redirecting you because Auto Reload is enabled.'
    }

    return 'Click below to load the content with the specified config.'
  }, [isAutoReloadEnabled, isServiceWorkerRegistered])

  useEffect(() => {
    if (isAutoReloadEnabled && isServiceWorkerRegistered && !isConfigPage(window.location.hash)) {
      window.location.reload()
    }
  }, [isAutoReloadEnabled, isServiceWorkerRegistered])

  const loadContent = useCallback(() => {
    setIsLoadingContent(true)
    window.location.href = reloadUrl
  }, [reloadUrl])

  if (isLoadingContent) {
    return <LoadingPage />
  }

  return (
    <>
      <Header />
      <div className="redirect-page">
        <div className="pa4-l mw7 mv5 center pa4">
          <h3 className="mt5">{displayString}</h3>
          <ServiceWorkerReadyButton className="w-100" id="load-content" label='Load content' waitingLabel='Waiting for service worker registration...' onClick={loadContent} />
        </div>
        {showConfigIframe && <ConfigIframe />}
      </div>
    </>
  )
}

export default (): React.JSX.Element => {
  return (
    <ServiceWorkerProvider>
      <ConfigProvider>
        <RedirectPage />
      </ConfigProvider>
    </ServiceWorkerProvider>
  )
}
