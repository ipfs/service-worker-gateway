import React from 'react'
import ReactDOMClient from 'react-dom/client'
import './app.css'
import App from './app.tsx'
import RedirectPage from './redirectPage.tsx'

const container = document.getElementById('root')
// set up debug logging if you want.
// import debug from 'debug';
// debug.enable('libp2p:*:error,-*:trace,libp2p:webtransport')

const sw = await navigator.serviceWorker.register(new URL('sw.ts', import.meta.url))
const root = ReactDOMClient.createRoot(container)

// get urlSearchParameters and check for existing helia-sw parameter & value
const urlSearchParams = new URLSearchParams(window.location.search)
const heliaSwPath = urlSearchParams.get('helia-sw')
if (heliaSwPath != null) {
  root.render(
    <RedirectPage />
  )
  // if heliaSwPath value is set, then we need to redirect to the path based helia-sw
  // e.g. http://localhost:3000/?helia-sw=/ipns/docs.ipfs.tech should redirect to http://localhost:3000/helia-sw/ipns/docs.ipfs.tech
  const pathname = heliaSwPath[0] === '/' ? heliaSwPath : `/${heliaSwPath}`
  // eslint-disable-next-line no-console
  console.log('pathname: ', pathname)
  const redirectURL = new URL(pathname, window.location.origin)
  window.location.replace(redirectURL.toString())
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
