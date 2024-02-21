import React from 'react'
import ReactDOMClient from 'react-dom/client'
import './app.css'
import App from './app.tsx'
import { loadConfigFromLocalStorage } from './lib/config-db.ts'
import { isPathOrSubdomainRequest } from './lib/path-or-subdomain.ts'
import RedirectPage from './redirectPage.tsx'

await loadConfigFromLocalStorage()
/**
 * You can change the BASE_URL when deploying this app to a different domain.
 */
const BASE_URL = process.env.BASE_URL ?? 'helia-sw-gateway.localhost'

const container = document.getElementById('root')

const sw = await navigator.serviceWorker.register(new URL('sw.ts', import.meta.url))
const root = ReactDOMClient.createRoot(container)

// SW did not trigger for this request
if (isPathOrSubdomainRequest(BASE_URL, window.location)) {
  // but the requested path is something it should, so show redirect and redirect to the same URL
  root.render(
    <RedirectPage />
  )
  window.location.replace(window.location.href)
} else {
  // the requested path is not recognized as a path or subdomain request, so render the app UI
  if (window.location.pathname !== '/') {
    // pathname is not blank, but is invalid. redirect to the root
    window.location.replace('/')
  } else {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )
  }
}

// always update the service worker
void sw.update()
