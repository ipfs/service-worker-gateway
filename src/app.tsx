import React, { useContext } from 'react'
import Config from './components/config.tsx'
import { ConfigContext } from './context/config-context.tsx'
import HelperUi from './helper-ui.tsx'
import { isConfigPage } from './lib/is-config-page.ts'
import { isPathOrSubdomainRequest } from './lib/path-or-subdomain.ts'
import RedirectPage from './redirectPage.tsx'

function App (): JSX.Element {
  const { isConfigExpanded, setConfigExpanded } = useContext(ConfigContext)

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
