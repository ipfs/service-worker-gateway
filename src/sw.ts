// import { clientsClaim } from 'workbox-core'
import type { Helia } from '@helia/interface'

import { getHelia } from './get-helia.ts'
import { ChannelActions } from './lib/common.ts'
import { connectAndGetFile } from './lib/connectAndGetFile.ts'
import { type ChannelMessage, HeliaServiceWorkerCommsChannel } from './lib/channel.ts'
import type { Libp2pConfigTypes } from './types.ts'
import { heliaFetch } from './lib/heliaFetch.ts'

// localStorage.setItem doesn't work in service workers
// import debug from 'debug'
// debug.enable('libp2p:websockets,libp2p:webtransport,libp2p:kad-dht,libp2p:dialer*,libp2p:connection-manager')
// debug.enable('libp2p:*:error')
// debug.enable('libp2p:*:error,libp2p:dialer*,libp2p:webtransport,-*:trace')

declare let self: ServiceWorkerGlobalScope

void self?.skipWaiting?.()
// clientsClaim()

const channel = new HeliaServiceWorkerCommsChannel('SW')

self.addEventListener('install', event => {
  console.log('sw installing')
})
self.addEventListener('activate', event => {
  console.log('sw activating')
})

let helia: Helia
const fetchHandler = async (url: URL): Promise<Response> => {
  if (helia == null) {
    helia = await getHelia({ libp2pConfigType: 'dht', usePersistentDatastore: false })
  } else {
    // await helia.start()
  }
  const response = await heliaFetch({ path: url.pathname, helia })
  // await helia.stop()

  return response
}

self.addEventListener('fetch', event => {
  const request = event.request
  // console.log('request: ', request)
  const urlString = request.url
  const url = new URL(urlString)
  // console.log('urlString: ', urlString)
  // the urls to intercept and handle ourselves should match /ipfs/ or /ipns/
  const urlInterceptRegex = [/\/ipfs\//, /\/ipns\//]
  if (urlInterceptRegex.some(regex => regex.test(url.pathname))) {
    console.log('intercepting request to ', urlString)
    // intercept and do our own stuff...
    event.respondWith(fetchHandler(url))
  }
})

interface SWDataContent {
  localMultiaddr?: string
  fileCid?: string
  libp2pConfigType: Libp2pConfigTypes
}

channel.onmessagefrom('WINDOW', async (event: MessageEvent<ChannelMessage<'WINDOW', SWDataContent>>) => {
  const { data } = event
  const { localMultiaddr, fileCid, libp2pConfigType } = data.data
  let helia: Helia
  switch (data.action) {
    case ChannelActions.GET_FILE:
      if (fileCid == null) {
        throw new Error('No fileCid provided')
      }
      helia = await getHelia({ libp2pConfigType })
      channel.postMessage({
        action: 'SHOW_STATUS',
        data: {
          text: `Got helia with ${libp2pConfigType} libp2p config`
        }
      })
      await connectAndGetFile({
        channel,
        localMultiaddr,
        fileCid,
        helia,
        action: data.action,
        cb: async ({ fileContent, action }) => { console.log('connectAndGetFile cb', fileContent, action) }
      })

      break
    // case ChannelActions.DIAL:
    //   try {
    //     const ma = multiaddr(data.data)
    //     console.log(`ma: `, ma);
    //     const dialResponse = await helia.libp2p.dial(ma)
    //     console.log(`sw dialResponse: `, dialResponse);
    //   } catch (e) {
    //     console.error(`sw dial error: `, e);
    //   }
    //   break;
    default:
      // console.warn('SW received unknown action', data.action)
      break
  }
})
