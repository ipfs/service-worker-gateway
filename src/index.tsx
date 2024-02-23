import React from 'react'
import ReactDOMClient from 'react-dom/client'
import './app.css'
import App from './app.tsx'
import { ConfigProvider } from './context/config-context.tsx'
import { ServiceWorkerProvider } from './context/service-worker-context.tsx'
import { loadConfigFromLocalStorage } from './lib/config-db.ts'

await loadConfigFromLocalStorage()

// SW did not trigger for this request
const container = document.getElementById('root')

const root = ReactDOMClient.createRoot(container)

root.render(
  <React.StrictMode>
    <ServiceWorkerProvider>
      <ConfigProvider expanded={window.location.pathname === '/config'}>
          <App />
      </ConfigProvider>
    </ServiceWorkerProvider>
  </React.StrictMode>
)
