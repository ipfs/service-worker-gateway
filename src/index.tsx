import 'preact/debug'
import React, { render } from 'preact/compat'
import App from './app.jsx'
import { RouterProvider, type Route } from './context/router-context.jsx'

// SW did not trigger for this request
const container = document.getElementById('root')
if (container == null) {
  /**
   * Should never happen, but preact types are not perfect
   */
  throw new Error('could not find root container')
}

const LazyConfig = React.lazy(async () => import('./pages/config.jsx'))
const LazyHelperUi = React.lazy(async () => import('./pages/helper-ui.jsx'))
const LazyRedirectPage = React.lazy(async () => import('./pages/redirect-page.jsx'))
const LazyInterstitial = React.lazy(async () => import('./pages/redirects-interstitial.jsx'))

const routes: Route[] = [
  { default: true, component: LazyHelperUi },
  { shouldRender: async () => (await import('./lib/routing-render-checks.js')).shouldRenderRedirectsInterstitial(), component: LazyInterstitial },
  { path: '#/ipfs-sw-config', shouldRender: async () => (await import('./lib/routing-render-checks.js')).shouldRenderConfigPage(), component: LazyConfig },
  {
    shouldRender: async () => {
      const renderChecks = await import('./lib/routing-render-checks.js')
      return renderChecks.shouldRenderRedirectPage()
    },
    component: LazyRedirectPage
  }
]

render(
  <React.StrictMode>
    <RouterProvider routes={routes}>
      <App />
    </RouterProvider>
  </React.StrictMode>,
  container
)
