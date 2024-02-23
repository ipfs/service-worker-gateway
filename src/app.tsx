import React, { useContext } from 'react'
import Config from './components/config.tsx'
import { ConfigContext } from './context/config-context.tsx'
import HelperUi from './helper-ui.tsx'
import { isPathOrSubdomainRequest } from './lib/path-or-subdomain.ts'
import { BASE_URL } from './lib/webpack-constants.ts'
import RedirectPage from './redirectPage.tsx'

function App (): JSX.Element {
  const { isConfigExpanded, setConfigExpanded } = useContext(ConfigContext)
  if (window.location.pathname === '/config') {
    setConfigExpanded(true)
  }
  if (window.location.pathname === '/config') {
    return <Config />
  }

  if (isPathOrSubdomainRequest(BASE_URL, window.location)) {
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
