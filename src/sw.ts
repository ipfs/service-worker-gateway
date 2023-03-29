// import { clientsClaim } from 'workbox-core'
import type { Helia } from '@helia/interface'
import { unixfs } from '@helia/unixfs'
import { CID } from 'multiformats/cid'
import FileType from 'file-type/core'

import { getHelia } from './get-helia.ts'
import { ChannelActions } from './lib/common.ts'
import { connectAndGetFile } from './lib/connectAndGetFile.ts'
import { type ChannelMessage, HeliaServiceWorkerCommsChannel } from './lib/channel.ts'
import type { Libp2pConfigTypes } from './types.ts'

// localStorage.setItem doesn't work in service workers
// import debug from 'debug'
// debug.enable('libp2p:websockets,libp2p:webtransport,libp2p:kad-dht,libp2p:dialer*,libp2p:connection-manager')
// debug.enable('libp2p:*:error')
// debug.enable('libp2p:*:error,libp2p:dialer*,libp2p:webtransport,-*:trace')

/**
 * Test files:
 * bafkreienxxjqg3jomg5b75k7547dgf7qlbd3qpxy2kbg537ck3rol4mcve  - text          - https://bafkreienxxjqg3jomg5b75k7547dgf7qlbd3qpxy2kbg537ck3rol4mcve.ipfs.w3s.link/?filename=test.txt
 * bafkreicafxt3zr4cshf7qteztjzl62ouxqrofu647e44wt7s2iaqjn7bra  - image/jpeg    - http://127.0.0.1:8080/ipfs/bafkreicafxt3zr4cshf7qteztjzl62ouxqrofu647e44wt7s2iaqjn7bra?filename=bafkreicafxt3zr4cshf7qteztjzl62ouxqrofu647e44wt7s2iaqjn7bra
 * QmY7fzZEpgDUqZ7BEePSS5JxxezDj3Zy36EEpWSmKmv5mo               - image/jpeg    - http://127.0.0.1:8080/ipfs/QmY7fzZEpgDUqZ7BEePSS5JxxezDj3Zy36EEpWSmKmv5mo?filename=QmY7fzZEpgDUqZ7BEePSS5JxxezDj3Zy36EEpWSmKmv5mo
 * bafkreif4ufrfpfcmqn5ltjvmeisgv4k7ykqz2mjygpngtwt4bijxosidqa  - image/svg+xml - https://bafkreif4ufrfpfcmqn5ltjvmeisgv4k7ykqz2mjygpngtwt4bijxosidqa.ipfs.dweb.link/?filename=Web3.Storage-logo.svg
 */

function isSvgText (bytes: Uint8Array): boolean {
  const svgText = new TextDecoder().decode(bytes.slice(0, 4))
  return svgText.startsWith('<svg')
}

async function getContentType ({ cid, bytes }): Promise<string> {
  // const fileType = magicBytesFiletype(bytes)
  // console.log('magicBytesFiletype(bytes): ', magicBytesFiletype(bytes))
  const fileTypeDep = await FileType.fromBuffer(bytes)
  if (typeof fileTypeDep !== 'undefined') {
    return fileTypeDep.mime
  }

  if (isSvgText(bytes)) {
    return 'image/svg+xml'
  }

  return 'text/plain'
}
declare let self: ServiceWorkerGlobalScope

void self?.skipWaiting?.()
// clientsClaim()

const channel = new HeliaServiceWorkerCommsChannel('SW')

function mergeUint8Arrays (a: Uint8Array, b: Uint8Array): Uint8Array {
  const c = new Uint8Array(a.length + b.length)
  c.set(a, 0)
  c.set(b, a.length)
  return c
}

self.addEventListener('install', event => {
  console.log('sw install')
})

const fetchHandler = async (event: FetchEvent): Promise<Response> => {
  const urlString = event.request.url
  const url = new URL(urlString)
  const path = url.pathname
  const pathParts = path.split('/')
  console.log('pathParts: ', pathParts)
  const scheme = pathParts[1]
  console.log('scheme: ', scheme)
  const cidString = pathParts[2]
  console.log('cidString: ', cidString)
  // TODO: fix issues with ipni routing
  // only works if I add my own bootstrap node for now.
  const helia = await getHelia({ libp2pConfigType: 'dht' })

  const fs = unixfs(helia)
  const cid = CID.parse(cidString)

  // const decoder = new TextDecoder()
  // const text = ''
  let bytes: Uint8Array = new Uint8Array()

  for await (const chunk of fs.cat(cid)) {
    console.log('chunk: ', chunk)
    // TODO: need to optimize this
    bytes = mergeUint8Arrays(bytes, chunk)
  }
  await helia.stop()

  // TODO: add mime-type

  const response = new Response(bytes, {
    headers: {
      'Content-Type': await getContentType({ cid, bytes })
    }

  })

  return response
}

self.addEventListener('fetch', event => {
  // event.waitUntil(new Promise(resolve => setTimeout(resolve, 1000)))
  console.log('sw fetch')
  const request = event.request
  // console.log('request: ', request)
  const urlString = request.url
  // console.log('urlString: ', urlString)
  // the urls to intercept and handle ourselves should match /ipfs/ or /ipns/
  const urlInterceptRegex = [/\/ipfs\//, /\/ipns\//]
  if (urlInterceptRegex.some(regex => regex.test(event.request.url))) {
    console.log('intercepting request to ', urlString)
    // intercept and do our own stuff...
    event.respondWith(fetchHandler(event))
  }
})

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
