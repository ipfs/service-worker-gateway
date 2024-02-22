import React, { useContext, useEffect } from 'react'
import Config from './components/config.tsx'
import { ConfigContext } from './context/config-context.tsx'
import HelperUi from './helper-ui.tsx'
import { registerServiceWorker } from './service-worker-utils'

function App (): JSX.Element {
  const { isConfigExpanded, setConfigExpanded } = useContext(ConfigContext)
  if (window.location.pathname === '/config') {
    setConfigExpanded(true)
  }

  useEffect(() => {
    void registerServiceWorker()
  }, [])

  if (isConfigExpanded) {
    return (<Config />)
  }
  return (
    <HelperUi />
  )
}

export default App
