import React, { Suspense } from 'react'
import ReactDOMClient from 'react-dom/client'
import LoadingIndicator from './components/loading-indicator.jsx'
import { RouteContext, RouterProvider } from './context/router-context.jsx'
import { injectCSS } from './lib/css-injector.js'
import { ensureSwScope } from './lib/first-hit-helpers.js'
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

async function renderUi (): Promise<void> {
  await ensureSwScope()
  try {
    // @ts-expect-error - css config is generated at build time
    // eslint-disable-next-line import-x/no-absolute-path
    const { CSS_FILENAME } = await import('/ipfs-sw-css-config.js')
    injectCSS(CSS_FILENAME)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('Failed to load CSS config, UI will render without styles:', err)
  }
  const container = document.getElementById('root')
  if (container == null) {
    throw new Error('No root container found')
  }

  const root = ReactDOMClient.createRoot(container)

  const LazyConfig = React.lazy(async () => import('./pages/config.jsx'))
  const LazyHelperUi = React.lazy(async () => import('./pages/helper-ui.jsx'))
  const LazyNoServiceWorkerErrorPage = React.lazy(async () => import('./pages/errors/no-service-worker.jsx'))
  const LazySubdomainWarningPage = React.lazy(async () => import('./pages/subdomain-warning.jsx'))

  let ErrorPage: null | React.LazyExoticComponent<() => ReactElement> = LazyNoServiceWorkerErrorPage

  if ('serviceWorker' in navigator) {
    ErrorPage = null
  }

  const routes: Route[] = [
    { default: true, component: ErrorPage ?? LazyHelperUi },
    { shouldRender: async () => renderChecks.shouldRenderConfigPage(), component: LazyConfig },
    { shouldRender: async () => renderChecks.shouldRenderNoServiceWorkerError(), component: LazyNoServiceWorkerErrorPage },
    { shouldRender: renderChecks.shouldRenderSubdomainWarningPage, component: LazySubdomainWarningPage }
  ]

  root.render(
    <React.StrictMode>
      <RouterProvider routes={routes}>
        <App />
      </RouterProvider>
    </React.StrictMode>
  )
}

renderUi().catch(err => {
  // eslint-disable-next-line no-console
  console.error('Failed to render UI:', err)
})
