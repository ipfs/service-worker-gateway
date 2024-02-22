import React from 'react'
import ReactDOMClient from 'react-dom/client'
import './app.css'
import App from './app.tsx'
import Config from './components/config.tsx'
import { ConfigProvider } from './context/config-context.tsx'
import { ServiceWorkerProvider } from './context/service-worker-context.tsx'
import { loadConfigFromLocalStorage } from './lib/config-db.ts'
import { isPathOrSubdomainRequest } from './lib/path-or-subdomain.ts'
import { BASE_URL } from './lib/webpack-constants.ts'
import RedirectPage from './redirectPage.tsx'

await loadConfigFromLocalStorage()

// SW did not trigger for this request
const container = document.getElementById('root')

const root = ReactDOMClient.createRoot(container)

if (window.location.pathname === '/config') {
  root.render(
    <React.StrictMode>
      <ServiceWorkerProvider>
        <ConfigProvider expanded={true}>
          <Config />
        </ConfigProvider>
      </ServiceWorkerProvider>
    </React.StrictMode>
  )
} else if (isPathOrSubdomainRequest(BASE_URL, window.location)) {
  // but the requested path is something it should, so show redirect and redirect to the same URL
  root.render(
    <React.StrictMode>
      <ServiceWorkerProvider>
        <ConfigProvider>
            <RedirectPage />
        </ConfigProvider>
      </ServiceWorkerProvider>
    </React.StrictMode>
  )
} else {
  root.render(
    <React.StrictMode>
      <ServiceWorkerProvider>
        <ConfigProvider>
            <App />
        </ConfigProvider>
      </ServiceWorkerProvider>
    </React.StrictMode>
  )
}
