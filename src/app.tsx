import React, { Suspense, useEffect } from 'react'
import ReactDOMClient from 'react-dom/client'
import LoadingIndicator from './components/loading-indicator.jsx'
import { RouteContext, RouterProvider } from './context/router-context.jsx'
import * as renderChecks from './lib/routing-render-checks.js'
import type { Route } from './context/router-context.jsx'
import type { ReactElement } from 'react'
import './app.css'

// SW did not trigger for this request

function App (): React.ReactElement {
  const { currentRoute } = React.useContext(RouteContext)

  return (
    <Suspense fallback={<LoadingIndicator />}>
      {currentRoute?.component != null && <currentRoute.component />}
    </Suspense>
  )
}

export default function renderUi (): void {
  const container = document.getElementById('root')

  const root = ReactDOMClient.createRoot(container)

  const LazyConfig = React.lazy(async () => import('./pages/config.jsx'))
  const LazyHelperUi = React.lazy(async () => import('./pages/helper-ui.jsx'))
  const LazyRedirectPage = React.lazy(async () => import('./pages/redirect-page.jsx'))
  const LazyServiceWorkerErrorPage = React.lazy(async () => import('./pages/errors/no-service-worker.jsx'))
  const LazySubdomainWarningPage = React.lazy(async () => import('./pages/subdomain-warning.jsx'))

  let ErrorPage: null | React.LazyExoticComponent<() => ReactElement> = LazyServiceWorkerErrorPage
  if ('serviceWorker' in navigator) {
    ErrorPage = null
  }

  const routes: Route[] = [
    { default: true, component: ErrorPage ?? LazyHelperUi },
    { shouldRender: async () => renderChecks.shouldRenderConfigPage(), component: LazyConfig },
    { shouldRender: async () => renderChecks.shouldRenderNoServiceWorkerError(), component: LazyServiceWorkerErrorPage },
    { shouldRender: renderChecks.shouldRenderSubdomainWarningPage, component: LazySubdomainWarningPage },
    {
      shouldRender: async () => renderChecks.shouldRenderRedirectPage(),
      component: LazyRedirectPage
    }
  ]

  root.render(
    <React.StrictMode>
      <RouterProvider routes={routes}>
        <App />
      </RouterProvider>
    </React.StrictMode>
  )
}
