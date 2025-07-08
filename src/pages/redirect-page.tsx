import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import Header from '../components/Header.jsx'
import { ConfigProvider } from '../context/config-context.jsx'
import { ServiceWorkerContext, ServiceWorkerProvider } from '../context/service-worker-context.jsx'
import { isConfigPage } from '../lib/is-config-page.js'
import { translateIpfsRedirectUrl } from '../lib/translate-ipfs-redirect-url.js'
import type { ReactElement } from 'react'
import './default-page-styles.css'

/**
 * With the changes in https://github.com/ipfs/service-worker-gateway/issues/757, the config should be loaded on the subdomain before ever rendering this page.
 */
function RedirectPage (): ReactElement {
  const { isServiceWorkerRegistered } = useContext(ServiceWorkerContext)
  const reloadUrl = translateIpfsRedirectUrl(window.location.href).href
  const [isLoadingContent, setIsLoadingContent] = useState(false)
  const isConfigLoading = false

  const displayString: string = useMemo(() => {
    if (!isServiceWorkerRegistered) {
      return 'Registering Helia service worker...'
    }
    if (!isConfigPage(window.location.hash)) {
      return 'Redirecting you.'
    }

    return 'Loading...'
  }, [isServiceWorkerRegistered])

  const loadContent = useCallback(() => {
    setIsLoadingContent(true)
    window.location.href = reloadUrl
  }, [reloadUrl])

  useEffect(() => {
    if (isServiceWorkerRegistered && !isConfigPage(window.location.hash) && !isLoadingContent && !isConfigLoading) {
      loadContent()
    }
  }, [isServiceWorkerRegistered, isConfigLoading, isLoadingContent])

  return (
    <>
      <Header />
      <div className='redirect-page'>
        <div className='pa4-l mw7 mv5 center pa4'>
          <h3 className='mt5'>{displayString}</h3>
        </div>
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
