// import { clientsClaim } from 'workbox-core'
import type { Helia } from '@helia/interface'

import { getHelia } from './get-helia.ts'
import { ChannelActions } from './lib/common.ts'
import { connectAndGetFile } from './lib/connectAndGetFile.ts'
import { type ChannelMessage, HeliaServiceWorkerCommsChannel } from './lib/channel.ts'
import type { Libp2pConfigTypes } from './types.ts'
import { heliaFetch } from './lib/heliaFetch.ts'
import AbortAbort from 'abortabort'
import { CID } from 'multiformats/cid'

declare let self: ServiceWorkerGlobalScope

void self?.skipWaiting?.()
// clientsClaim()

const channel = new HeliaServiceWorkerCommsChannel('SW')

let helia: Helia
self.addEventListener('install', event => {
  if (helia != null) {
    void (async () => {
      console.log('stopping existing helia instance now')
      await helia.stop()
    })()
  }
  console.log('sw installing')
})
self.addEventListener('activate', event => {
  console.log('sw activating')
  void (async () => {
    // helia = await getHelia({ libp2pConfigType: 'dht', usePersistentDatastore: true })
    helia = await getHelia({ libp2pConfigType: 'ipni', usePersistentDatastore: true })
    // helia = await getHelia({ libp2pConfigType: 'ipni', usePersistentDatastore: false })
  })()
})

const fetchHandler = async ({ url, request }: { url: URL, request: Request }): Promise<Response> => {
  if (helia == null) {
    // helia = await getHelia({ libp2pConfigType: 'dht', usePersistentDatastore: true })
    helia = await getHelia({ libp2pConfigType: 'ipni', usePersistentDatastore: true })
    // helia = await getHelia({ libp2pConfigType: 'ipni', usePersistentDatastore: false })
  } else {
    // await helia.start()
  }
  // 2 second timeout - for debugging
  // const abortController = new AbortAbort({ timeout: 2 * 1000 })

  /**
   * Note that there are existing bugs regarding service worker signal handling:
   * * https://bugs.chromium.org/p/chromium/issues/detail?id=823697
   * * https://bugzilla.mozilla.org/show_bug.cgi?id=1394102
   */
  // 5 minute timeout
  const abortController = new AbortAbort({ timeout: 5 * 60 * 1000 })
  try {
    const response = await heliaFetch({ path: url.pathname, helia, signal: abortController.signal, headers: request.headers })
    return response
  } catch (err: unknown) {
    console.error('fetchHandler error: ', err)
    const errorMessage = err instanceof Error ? err.message : JSON.stringify(err)

    if (errorMessage.includes('aborted')) {
      return new Response('heliaFetch error aborted due to timeout: ' + errorMessage, { status: 408 })
    }
    return new Response('heliaFetch error: ' + errorMessage, { status: 500 })
  }
  // await helia.stop()
}

self.addEventListener('fetch', event => {
  const request = event.request
  console.log('request: ', request)
  const urlString = request.url
  const url = new URL(urlString)
  // console.log('urlString: ', urlString)
  // the urls to intercept and handle ourselves should match /helia-sw/
  const urlInterceptRegex = [/\/helia-sw\//]

  // const referredFromSameOrigin = request.referrer.startsWith(self.location.origin)
  // // if the request is not for the same origin, then we should not intercept it
  // if (!referredFromSameOrigin) {
  //   return
  // }

  console.log('self.location.origin: ', self.location.origin)
  console.log('intercepting request to ', urlString)
  console.log('referred from ', request.referrer)

  const referredUrlIsPreviouslyIntercepted = request.referrer.includes('/helia-sw/')
  if (referredUrlIsPreviouslyIntercepted) {
    const destinationParts = urlString.split('/')
    const referrerParts = request.referrer.split('/')
    const newParts: string[] = []
    let index = 0
    while (destinationParts[index] === referrerParts[index]) {
      newParts.push(destinationParts[index])
      index++
    }
    // console.log('leftover parts: ', referrerParts.slice(index))
    try {
      if (referrerParts[index] === 'helia-sw') {
        newParts.push(referrerParts[index])

        CID.parse(referrerParts[index + 1])
        newParts.push(referrerParts[index + 1])
      } else {
        CID.parse(referrerParts[index])
        newParts.push(referrerParts[index])
      }
    } catch (err) {
      // ignore
    }
    const newUrl = new URL(newParts.join('/') + '/' + destinationParts.slice(index).join('/'))
    console.log('rerouting request to: ', newUrl.toString())
    // event.respondWith(fetchHandler({ url: newUrl, request }))

    /**
     * respond with redirect to newUrl
     */
    if (newUrl.toString() !== urlString) {
      event.respondWith(Response.redirect(newUrl.toString(), 307))
      return
    }
  }

  if (urlInterceptRegex.some(regex => regex.test(url.pathname))) {
    // intercept and do our own stuff...
    event.respondWith(fetchHandler({ url, request }))
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
