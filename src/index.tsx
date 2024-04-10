import React from 'react'
import ReactDOMClient from 'react-dom/client'
import './app.css'
import App from './app.jsx'
import { ConfigProvider } from './context/config-context.jsx'
import { RouterProvider, type Route } from './context/router-context.jsx'
import { ServiceWorkerProvider } from './context/service-worker-context.jsx'
// import { loadConfigFromLocalStorage } from './lib/config-db.js'
import { shouldRenderConfigPage, shouldRenderRedirectPage } from './lib/routing-render-checks.js'

// await loadConfigFromLocalStorage()

// SW did not trigger for this request
const container = document.getElementById('root')

const root = ReactDOMClient.createRoot(container)

const LazyConfig = React.lazy(async () => import('./pages/config.jsx'))
const LazyHelperUi = React.lazy(async () => import('./pages/helper-ui.jsx'))
const LazyRedirectPage = React.lazy(async () => import('./pages/redirect-page.jsx'))

const routes: Route[] = [
  { default: true, component: LazyHelperUi },
  { path: '#/ipfs-sw-config', shouldRender: shouldRenderConfigPage, component: LazyConfig },
  { shouldRender: shouldRenderRedirectPage, component: LazyRedirectPage }
]

root.render(
  <React.StrictMode>
    <ServiceWorkerProvider>
      <ConfigProvider>
        <RouterProvider routes={routes}>
          <App />
        </RouterProvider>
      </ConfigProvider>
    </ServiceWorkerProvider>
  </React.StrictMode>
)
