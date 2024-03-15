import React from 'react'
import ReactDOMClient from 'react-dom/client'
import './app.css'
import App from './app.jsx'
import { ConfigProvider } from './context/config-context.jsx'
import { ServiceWorkerProvider } from './context/service-worker-context.jsx'
import { loadConfigFromLocalStorage } from './lib/config-db.js'
import { isConfigPage } from './lib/is-config-page.js'

await loadConfigFromLocalStorage()

// SW did not trigger for this request
const container = document.getElementById('root')

const root = ReactDOMClient.createRoot(container)

root.render(
  <React.StrictMode>
    <ServiceWorkerProvider>
      <ConfigProvider expanded={isConfigPage(window.location.hash)}>
          <App />
      </ConfigProvider>
    </ServiceWorkerProvider>
  </React.StrictMode>
)
