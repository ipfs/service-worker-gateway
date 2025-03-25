import React, { type ReactElement } from 'react'
import ReactDOMClient from 'react-dom/client'
import App from './app.jsx'
import { RouterProvider, type Route } from './context/router-context.jsx'
import { ensureSwScope } from './lib/first-hit-helpers.js'
import * as renderChecks from './lib/routing-render-checks.js'

// SW did not trigger for this request
const container = document.getElementById('root')

const root = ReactDOMClient.createRoot(container)

const LazyConfig = React.lazy(async () => import('./pages/config.jsx'))
const LazyHelperUi = React.lazy(async () => import('./pages/helper-ui.jsx'))
const LazyRedirectPage = React.lazy(async () => import('./pages/redirect-page.jsx'))
const LazyInterstitial = React.lazy(async () => import('./pages/redirects-interstitial.jsx'))
const LazyServiceWorkerErrorPage = React.lazy(async () => import('./pages/errors/no-service-worker.jsx'))
const LazySubdomainWarningPage = React.lazy(async () => import('./pages/subdomain-warning.jsx'))

let ErrorPage: null | React.LazyExoticComponent<() => ReactElement> = LazyServiceWorkerErrorPage
if ('serviceWorker' in navigator) {
  ErrorPage = null
}

const routes: Route[] = [
  { default: true, component: ErrorPage ?? LazyHelperUi },
  { shouldRender: async () => renderChecks.shouldRenderNoServiceWorkerError(), component: LazyServiceWorkerErrorPage },
  { shouldRender: renderChecks.shouldRenderSubdomainWarningPage, component: LazySubdomainWarningPage },
  { shouldRender: async () => renderChecks.shouldRenderRedirectsInterstitial(), component: LazyInterstitial },
  { path: '#/ipfs-sw-config', shouldRender: async () => renderChecks.shouldRenderConfigPage(), component: LazyConfig },
  {
    shouldRender: async () => renderChecks.shouldRenderRedirectPage(),
    component: LazyRedirectPage
  }
]

void ensureSwScope().finally(() => {
  root.render(
  <React.StrictMode>
    <RouterProvider routes={routes}>
      <App />
    </RouterProvider>
  </React.StrictMode>
  )
})
