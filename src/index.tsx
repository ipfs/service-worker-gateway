import React from 'react'
import ReactDOMClient from 'react-dom/client'
import './app.css'
import App from './app.tsx'
import RedirectPage from './redirectPage.tsx'

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

// eslint-disable-next-line no-console
console.log('window.location: ', window.location)
// get the subdomain from the window.location, minus the BASE_URL
const subdomain = window.location.hostname.replace(`.${BASE_URL}`, '')
// eslint-disable-next-line no-console
console.log('subdomain: ', subdomain)

const subdomainRegex = /^(?<origin>[^/]+)\.(?<protocol>ip[fn]s)?$/
const subdomainMatch = subdomain.match(subdomainRegex)
// eslint-disable-next-line no-console
console.log('subdomainMatch: ', subdomainMatch)

// get urlSearchParameters and check for existing helia-sw parameter & value
const urlSearchParams = new URLSearchParams(window.location.search)
const heliaSwPath = urlSearchParams.get('helia-sw')
// const heliaSwSubdomain = urlSearchParams.get('helia-sw-subdomain')
if (heliaSwPath != null) {
  root.render(
    <RedirectPage />
  )
  // if heliaSwPath value is set, then we need to redirect to the path based helia-sw
  // e.g. http://localhost:3000/?helia-sw=/ipns/docs.ipfs.tech should redirect to http://localhost:3000/ipns/docs.ipfs.tech
  const pathname = heliaSwPath[0] === '/' ? heliaSwPath : `/${heliaSwPath}`
  const redirectURL = new URL(pathname, window.location.origin)
  window.location.replace(redirectURL.toString())
} else if (subdomainMatch?.groups != null) {
  // request was not intercepted by service worker, so we need to trigger that.

  // first, render the redirect page.
  root.render(
    <RedirectPage />
  )
  // if we have a subdomain, then we need to redirect to the subdomain based helia-sw
  // const { origin, protocol } = subdomainMatch.groups
  // const pathname = `?helia-sw-subdomain=/${protocol}/${origin}`
  // const contentUrl = new URL(pathname, window.location.origin)
  // window.location.replace(contentUrl.toString())
  window.location.replace(window.location.href)
} else {
  // we don't have a helia-sw query parameter, so let's render the demo app
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

// always update the service worker
void sw.update()
