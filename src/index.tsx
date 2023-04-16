import React from 'react'
import ReactDOMClient from 'react-dom/client'

import './app.css'
import App from './app.tsx'
import { getHelia } from './get-helia.ts'
import { unixfs } from '@helia/unixfs'
import { CID } from 'multiformats/cid'
import { getDirectoryResponse } from './lib/heliaFetch/getDirectoryResponse.ts'
import { getFileResponse } from './lib/heliaFetch/getFileResponse.ts'

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

// const swURL = new URL('sw.ts', import.meta.url)
// console.log('swURL: ', swURL)
// const sw = await navigator.serviceWorker.register(swURL)

const sw = await navigator.serviceWorker.register(new URL('sw.ts', import.meta.url))
console.log('sw: ', sw)

// always update the service worker
// void sw.update()

// DEBUGGING
// void (async () => {
//   const helia = await getHelia()
//   const fs = unixfs(helia)
//   const cid = CID.parse('bafybeidsp6fva53dexzjycntiucts57ftecajcn5omzfgjx57pqfy3kwbq')
//   // const statPath = contentPath != null ? '/' + contentPath : undefined
//   const statPath = undefined
//   const abortController = new AbortController()
//   const signal = abortController.signal

//   try {
//     const fsStatInfo = await fs.stat(cid, { signal, path: statPath })
//     switch (fsStatInfo.type) {
//       case 'directory':
//         return await getDirectoryResponse({ cid, fs, helia, signal, headers: undefined, path: undefined })
//       case 'raw':
//       case 'file':
//         return await getFileResponse({ cid, fs, helia, signal, headers: undefined, path: undefined })
//       default:
//         throw new Error(`Unsupported fsStatInfo.type: ${fsStatInfo.type}`)
//     }
//   } catch (e) {
//     console.error(`fs.stat error for cid '${cid}' and path '${statPath}'`, e)
//   }
// })()
