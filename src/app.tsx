import React, { useContext, useEffect, useState } from 'react'
import Config from './components/config.tsx'
import { ConfigContext } from './context/config-context.tsx'
import { ServiceWorkerContext } from './context/service-worker-context.tsx'
import HelperUi from './helper-ui.tsx'
import { getActualUrl } from './lib/ipfs-hosted-redirect-utils.ts'
import { isConfigPage } from './lib/is-config-page.ts'
import { isPathOrSubdomainRequest, findOriginIsolationRedirect } from './lib/path-or-subdomain.ts'
import RedirectPage from './redirectPage.tsx'

function App (): JSX.Element {
  const { isConfigExpanded, setConfigExpanded } = useContext(ConfigContext)
  const [originRedirect, setOriginRedirect] = useState<string | null>(null)
  const { isServiceWorkerRegistered } = useContext(ServiceWorkerContext)

  useEffect(() => {
    async function originEnforcement (): Promise<void> {
      // enforce  early when loaded before SW was registered
      const originRedirect = await findOriginIsolationRedirect(window.location)
      setOriginRedirect(originRedirect)
    }
    void originEnforcement()
  }, [])

  useEffect(() => {
    if (originRedirect !== null) {
      window.location.replace(originRedirect)
      return
    }
    const actualUrl = getActualUrl(window.location.href)
    if (isServiceWorkerRegistered && window.location.href !== actualUrl.href) {
      /**
       * If hosted on ipfs site and we were redirected to a ?helia-sw=/ip[fn]s/<path> url,
       * this will reload with a request to /ip[fn]s/<path>, because the SW can capture it now.
       */
      window.location.replace(actualUrl)
    }
  }, [isServiceWorkerRegistered, originRedirect])

  if (isConfigPage()) {
    setConfigExpanded(true)
    return <Config />
  }

  if (isPathOrSubdomainRequest(window.location)) {
    return (<RedirectPage />)
  }

  if (isConfigExpanded) {
    return (<Config />)
  }
  return (
    <HelperUi />
  )
}

export default App
