import React from 'react'
import ReactDOMClient from 'react-dom/client'
import './app.css'
import App from './app.tsx'
import { loadConfigFromLocalStorage } from './lib/config-db.ts'
import RedirectPage from './redirectPage.tsx'

await loadConfigFromLocalStorage()
/**
 * You can change the BASE_URL when deploying this app to a different domain.
 */
const BASE_URL = process.env.BASE_URL ?? 'helia-sw-gateway.localhost'

const container = document.getElementById('root')
// set up debug logging if you want.
// import debug from 'debug';
// debug.enable('libp2p:*:error,-*:trace,libp2p:webtransport')

const sw = await navigator.serviceWorker.register(new URL('sw.ts', import.meta.url))
const root = ReactDOMClient.createRoot(container)

const subdomain = window.location.hostname.replace(`.${BASE_URL}`, '')
const subdomainRegex = /^(?<origin>[^/]+)\.(?<protocol>ip[fn]s)?$/
const subdomainMatch = subdomain.match(subdomainRegex)

const isPathBasedRequest = window.location.pathname.startsWith('/ip')
const isSubdomainRequest = subdomainMatch?.groups != null

if ((isPathBasedRequest || isSubdomainRequest)) {
  // SW did not trigger for this request, so show redirect and redirect to the same URL
  root.render(
    <RedirectPage />
  )
  window.location.replace(window.location.href)
} else {
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
