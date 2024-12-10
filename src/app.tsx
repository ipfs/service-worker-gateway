import React, { Suspense, useEffect } from 'react'
import { RouteContext } from './context/router-context.jsx'
import { checkSubdomainSupport } from './lib/check-subdomain-support.js'
import './app.css'

function App (): React.ReactElement {
  const { currentRoute } = React.useContext(RouteContext)

  useEffect(() => {
    void checkSubdomainSupport()
  }, [])

  return (
    <Suspense fallback={<div>Loading...</div>}>
      {currentRoute?.component != null && <currentRoute.component />}
    </Suspense>
  )
}

export default App
