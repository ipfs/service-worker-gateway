import React from 'react'
import ReactDOMClient from 'react-dom/client'
import App from './app.jsx'
import { RouterProvider, type Route } from './context/router-context.jsx'
import * as renderChecks from './lib/routing-render-checks.js'

// SW did not trigger for this request
const container = document.getElementById('root')

const root = ReactDOMClient.createRoot(container)

const LazyConfig = React.lazy(async () => import('./pages/config.jsx'))
const LazyHelperUi = React.lazy(async () => import('./pages/helper-ui.jsx'))
const LazyRedirectPage = React.lazy(async () => import('./pages/redirect-page.jsx'))
const LazyInterstitial = React.lazy(async () => import('./pages/redirects-interstitial.jsx'))

const routes: Route[] = [
  { default: true, component: LazyHelperUi },
  { shouldRender: async () => renderChecks.shouldRenderRedirectsInterstitial(), component: LazyInterstitial },
  { path: '#/ipfs-sw-config', shouldRender: async () => renderChecks.shouldRenderConfigPage(), component: LazyConfig },
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
