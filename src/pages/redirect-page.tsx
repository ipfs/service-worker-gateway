import React, { useCallback, useContext, useEffect, useMemo, useState, type ReactElement } from 'react'
import Header from '../components/Header.jsx'
import { ConfigProvider } from '../context/config-context.jsx'
import { ServiceWorkerContext, ServiceWorkerProvider } from '../context/service-worker-context.jsx'
import { setConfig, type ConfigDb } from '../lib/config-db.js'
import { getSubdomainParts } from '../lib/get-subdomain-parts.js'
import { isConfigPage } from '../lib/is-config-page.js'
import { getUiComponentLogger, uiLogger } from '../lib/logger.js'
import { tellSwToReloadConfig } from '../lib/sw-comms.js'
import { translateIpfsRedirectUrl } from '../lib/translate-ipfs-redirect-url.js'
import './default-page-styles.css'
import LoadingIndicator from "../components/loading-indicator.jsx"

const uiComponentLogger = getUiComponentLogger('redirect-page')
const log = uiLogger.forComponent('redirect-page')

const ConfigIframe: React.FC = () => {
  const { parentDomain } = getSubdomainParts(window.location.href)
  const { isServiceWorkerRegistered } = useContext(ServiceWorkerContext)

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

  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Only show iframe after service worker is registered
    if (isServiceWorkerRegistered) {
      setIsVisible(true)
    }
  }, [isServiceWorkerRegistered])

  return (
    <div style={{ display: isVisible ? "block" : "none" }}>
      <iframe
        id="redirect-config-iframe"
        src={iframeSrc}
        style={{ width: "100vw", height: "100vh", border: "none" }}
      />
    </div>
  )
}

function RedirectPage({
  showConfigIframe = true,
}: {
  showConfigIframe?: boolean
}): ReactElement {
  const { isServiceWorkerRegistered } = useContext(ServiceWorkerContext)
  const [reloadUrl, setReloadUrl] = useState(
    translateIpfsRedirectUrl(window.location.href).href
  )
  const [isLoadingContent, setIsLoadingContent] = useState(false)
  const [isConfigLoading, setIsConfigLoading] = useState(true)

  useEffect(() => {
    if (isConfigPage(window.location.hash)) {
      setReloadUrl(window.location.href.replace("#/ipfs-sw-config", ""))
    }

    async function doWork(config: ConfigDb): Promise<void> {
      try {
        await setConfig(config, uiComponentLogger)
        await tellSwToReloadConfig()
        log.trace(
          "redirect-page: RELOAD_CONFIG_SUCCESS on %s",
          window.location.origin
        )
        setIsConfigLoading(false)
      } catch (err) {
        log.error("redirect-page: error setting config on subdomain", err)
      }
    }
    const listener = (event: MessageEvent): void => {
      if (event.data?.source === "helia-sw-config-iframe") {
        log.trace(
          "redirect-page: received RELOAD_CONFIG message from iframe",
          event.data
        )
        const config = event.data?.config
        if (config != null) {
          void doWork(config as ConfigDb)
        } else {
          log.error(
            "redirect-page: received RELOAD_CONFIG message from iframe, but no config",
            event.data
          )
        }
      }
    }
    window.addEventListener("message", listener)
    return () => {
      window.removeEventListener("message", listener)
    }
  }, [])

  const displayString: string = useMemo(() => {
    if (!isServiceWorkerRegistered) {
      return "Setting up Helia service worker to handle IPFS content..."
    }
    if (!isConfigPage(window.location.hash)) {
      return "Preparing to load your IPFS content..."
    }
    if (isConfigLoading) {
      return "Configuring Helia service worker..."
    }

    return "Almost there! Loading your content..."
  }, [isServiceWorkerRegistered, isConfigLoading])

  const loadContent = useCallback(() => {
    if (!isLoadingContent) {
      setIsLoadingContent(true)
      // Use replace instead of href to prevent back button issues
      window.location.replace(reloadUrl)
    }
  }, [reloadUrl, isLoadingContent])

  // Handle initial redirect when service worker is ready
  useEffect(() => {
    if (
      isServiceWorkerRegistered &&
      !isConfigPage(window.location.hash) &&
      !isLoadingContent &&
      !isConfigLoading
    ) {
      void loadContent()
    }
  }, [
    isServiceWorkerRegistered,
    isConfigLoading,
    isLoadingContent,
    loadContent,
  ])

  // Handle redirect after config is loaded
  useEffect(() => {
    if (!isConfigLoading && !isLoadingContent && isServiceWorkerRegistered) {
      void loadContent()
    }
  }, [
    isConfigLoading,
    isLoadingContent,
    isServiceWorkerRegistered,
    loadContent,
  ])

  // Force redirect if we're stuck
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!isLoadingContent && isServiceWorkerRegistered) {
        void loadContent()
      }
    }, 2000) // 2 second timeout

    return () => clearTimeout(timeout)
  }, [isLoadingContent, isServiceWorkerRegistered, loadContent])

  return (
    <>
      <Header />
      <div
        className="redirect-page"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "calc(100vh - 80px)",
          backgroundColor: "#f5f6fa",
        }}
      >
        <div
          style={{
            textAlign: "center",
            padding: "2rem",
            borderRadius: "8px",
            backgroundColor: "white",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            maxWidth: "600px",
            width: "90%",
          }}
        >
          <LoadingIndicator />
          <h2
            style={{
              fontSize: "1.5rem",
              color: "#2c3e50",
              marginBottom: "1rem",
              marginTop: "1.5rem",
            }}
          >
            {displayString}
          </h2>
        </div>
        {showConfigIframe && <ConfigIframe />}
      </div>
    </>
  )
}

export default (): ReactElement => {
  return (
    <ServiceWorkerProvider>
      <ConfigProvider>
        <RedirectPage />
      </ConfigProvider>
    </ServiceWorkerProvider>
  )
}
