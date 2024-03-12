import React, { useContext } from 'react'
import Config from './components/config.jsx'
import { ConfigContext } from './context/config-context.jsx'
import HelperUi from './helper-ui.jsx'
import { isConfigPage } from './lib/is-config-page.js'
import { isPathOrSubdomainRequest } from './lib/path-or-subdomain.js'
import RedirectPage from './redirectPage.jsx'

function App (): JSX.Element {
  const { isConfigExpanded, setConfigExpanded } = useContext(ConfigContext)
  const isRequestToViewConfigPage = isConfigPage(window.location.hash)
  const isSubdomainRender = isPathOrSubdomainRequest(window.location)

  if (isRequestToViewConfigPage) {
    if (isSubdomainRender) {
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
