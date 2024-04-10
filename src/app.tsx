import React, { Suspense } from 'preact/compat'
import { RouteContext } from './context/router-context.jsx'
import './app.css'

function App (): JSX.Element {
  const { currentRoute } = React.useContext(RouteContext)
  return (
    <Suspense fallback={<div>Loading...</div>}>
      {currentRoute?.component != null && <currentRoute.component />}
    </Suspense>
  )
}

export default App
