import React, { useContext } from 'react'
import Config from './components/config.tsx'
import { ConfigContext } from './context/config-context.tsx'
import HelperUi from './helper-ui.tsx'

function App (): JSX.Element {
  const { isConfigExpanded, setConfigExpanded } = useContext(ConfigContext)
  if (window.location.pathname === '/config') {
    setConfigExpanded(true)
  }

  if (isConfigExpanded) {
    return (<Config />)
  }
  return (
    <HelperUi />
  )
}

export default App
