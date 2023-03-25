import React from 'react'
import ReactDOMClient from 'react-dom/client'

import './app.css'
import App from './app.tsx'

const container = document.getElementById('root')
const root = ReactDOMClient.createRoot(container)

// set up debug logging if you want.
// import debug from 'debug';
// debug.enable('libp2p:*:error,-*:trace,libp2p:webtransport')

// simple demo showing messageAndWaitForResponse
// (async () => {
//   const result = await channel.messageAndWaitForResponse('SW', {action: 'PING', data: '123'});
//   console.log(`WINDOW ping result: `, result);
// })();

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
const sw = await navigator.serviceWorker.register(new URL('sw/index.ts', import.meta.url))
console.log('sw: ', sw)

// always update the service worker
void sw.update()
