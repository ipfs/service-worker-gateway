import 'preact/debug'
import React, { render } from 'preact/compat'
import App from './app.jsx'
import { ConfigProvider } from './context/config-context.jsx'
import { RouterProvider, type Route } from './context/router-context.jsx'
import { ServiceWorkerProvider } from './context/service-worker-context.jsx'

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
  { shouldRender: async () => (await import('./lib/routing-render-checks.js')).shouldRenderRedirectPage(), component: LazyRedirectPage }
]

render(
  <React.StrictMode>
    <ServiceWorkerProvider>
      <ConfigProvider>
        <RouterProvider routes={routes}>
          <App />
        </RouterProvider>
      </ConfigProvider>
    </ServiceWorkerProvider>
  </React.StrictMode>,
  container
)
