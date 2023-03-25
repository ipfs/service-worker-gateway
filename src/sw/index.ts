import { clientsClaim } from 'workbox-core'
import type { Helia } from '@helia/interface'

import { getHelia } from '../get-helia.ts'
import { ChannelActions } from '../lib/common.ts'
import { connectAndGetFile } from '../lib/connectAndGetFile.ts'
import { type ChannelMessage, HeliaServiceWorkerCommsChannel } from '../lib/channel.ts'
import type { Libp2pConfigTypes } from '../types.ts'

// localStorage.setItem doesn't work in service workers
// import debug from 'debug'
// debug.enable('libp2p:websockets,libp2p:webtransport,libp2p:kad-dht,libp2p:dialer*,libp2p:connection-manager')
// debug.enable('libp2p:*:error')
// debug.enable('libp2p:*:error,libp2p:dialer*,libp2p:webtransport,-*:trace')

declare let self: ServiceWorkerGlobalScope

void self?.skipWaiting?.()
clientsClaim()

const channel = new HeliaServiceWorkerCommsChannel('SW')

self.oninstall = async (event) => {
  console.log('sw oninstall')
}

// simple demo of the messageAndWaitForResponse method
// (async () => {
//   const result = await channel.messageAndWaitForResponse('WINDOW', {action: 'PING', data: '123'});
//   console.log(`SW ping result: `, result);

// })();

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

self.onactivate = async (event) => {
  console.log('sw onactivate')
}

console.log('Service Worker Loaded')
