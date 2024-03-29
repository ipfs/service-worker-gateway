import React, { useContext } from 'react'
import Config from './components/config.jsx'
import { ConfigContext } from './context/config-context.jsx'
import HelperUi from './helper-ui.jsx'
import { isConfigPage } from './lib/is-config-page.js'
import { isPathOrSubdomainRequest, isSubdomainGatewayRequest } from './lib/path-or-subdomain.js'
import RedirectPage from './redirectPage.jsx'

function App (): JSX.Element {
  const { isConfigExpanded, setConfigExpanded } = useContext(ConfigContext)
  const isRequestToViewConfigPage = isConfigPage(window.location.hash)
  const isSubdomainRender = isSubdomainGatewayRequest(window.location)
  const shouldRequestBeHandledByServiceWorker = isPathOrSubdomainRequest(window.location) && !isRequestToViewConfigPage

  if (shouldRequestBeHandledByServiceWorker) {
    if (window.self === window.top && isSubdomainRender) {
      return (<RedirectPage />)
    } else {
      // rendering redirect page without iframe because this is a top level window and subdomain request.
      return (<RedirectPage showConfigIframe={false} />)
    }
  }

  if (isRequestToViewConfigPage) {
    if (isSubdomainRender && window.self === window.top) {
      return <RedirectPage />
    }

    setConfigExpanded(true)
    return <Config />
  }

  if (isSubdomainRender) {
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
