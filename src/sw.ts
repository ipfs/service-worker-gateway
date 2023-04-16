/* eslint-disable @typescript-eslint/strict-boolean-expressions */
// import { clientsClaim } from 'workbox-core'
import type { Helia } from '@helia/interface'

import { getHelia } from './get-helia.ts'
import { ChannelActions } from './lib/common.ts'
import { connectAndGetFile } from './lib/connectAndGetFile.ts'
import { type ChannelMessage, HeliaServiceWorkerCommsChannel } from './lib/channel.ts'
import type { Libp2pConfigTypes } from './types.ts'
import { heliaFetch } from './lib/heliaFetch.ts'
import AbortAbort from 'abortabort'
// import { CID } from 'multiformats/cid'
import mime from 'mime-types'

declare let self: ServiceWorkerGlobalScope

void self?.skipWaiting?.()
// clientsClaim()

const channel = new HeliaServiceWorkerCommsChannel('SW')

let helia: Helia
self.addEventListener('install', event => {
  // if (helia != null) {
  //   void (async () => {
  //     console.log('stopping existing helia instance now')
  //     await helia.stop()
  //   })()
  // }
  console.log('sw installing')
})
self.addEventListener('activate', event => {
  console.log('sw activating')
  // void (async () => {
  //   // helia = await getHelia({ libp2pConfigType: 'dht', usePersistentDatastore: true })
  //   helia = await getHelia({ libp2pConfigType: 'ipni', usePersistentDatastore: true })
  //   // helia = await getHelia({ libp2pConfigType: 'ipni', usePersistentDatastore: false })
  // })()
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
    return await heliaFetch({ path: url.pathname, helia, signal: abortController.signal, headers: request.headers })
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
// const urlInterceptRegex = [/\/helia-sw\/ip(n|f)s/]
const urlInterceptRegex = [/\/ip(n|f)s/]

/**
 *
 * @param event
 * @todo make this smarter
 * @returns
 */
const isReferrerPreviouslyIntercepted = (event: FetchEvent): boolean => {
  return urlInterceptRegex.some(regex => regex.test(event.request.referrer)) // && getCidFromUrl(event.request.referrer) != null
}

const isRootRequestForContent = (event: FetchEvent): boolean => {
  const urlIsPreviouslyIntercepted = urlInterceptRegex.some(regex => regex.test(event.request.url))
  const isRootRequest = !isReferrerPreviouslyIntercepted(event) && urlIsPreviouslyIntercepted
  return isRootRequest // && getCidFromUrl(event.request.url) != null
}

const isValidRequestForSW = (event: FetchEvent): boolean =>
  isRootRequestForContent(event) || isReferrerPreviouslyIntercepted(event)

self.addEventListener('fetch', event => {
  const request = event.request
  const urlString = request.url
  const url = new URL(urlString)
  console.log('service worker location: ', self.location)

  if (!isValidRequestForSW(event)) {
    console.warn('not a valid request for helia-sw, ignoring ', urlString)
    return
  }
  // console.log('request: ', request)
  // console.log('self.location.origin: ', self.location.origin)
  console.log('intercepting request to ', urlString)
  if (isReferrerPreviouslyIntercepted(event)) {
    console.log('referred from ', request.referrer)
    const destinationParts = urlString.split('/')
    const referrerParts = request.referrer.split('/')
    const newParts: string[] = []
    let index = 0
    while (destinationParts[index] === referrerParts[index] && index < destinationParts.length && index < referrerParts.length) {
      newParts.push(destinationParts[index])
      index++
    }
    // console.log(`leftover parts for '${request.referrer}' -> '${urlString}': `, referrerParts.slice(index))
    newParts.push(...referrerParts.slice(index))

    const newUrlString = newParts.join('/') + '/' + destinationParts.slice(index).join('/')
    const newUrl = new URL(newUrlString)

    /**
     * respond with redirect to newUrl
     */
    if (newUrl.toString() !== urlString) {
      console.log('rerouting request to: ', newUrl.toString())
      const redirectHeaders = new Headers()
      redirectHeaders.set('Location', newUrl.toString())
      // const redirectResponse = Response.redirect(newUrl.toString(), 307)
      // http://localhost:3000/helia-sw/QmeUdoMyahuQUPHS2odrZEL6yk2HnNfBJ147BeLXsZuqLJ/images/meet-builders-thumbnail-pinata.png
      if (mime.lookup(newUrl.toString())) {
        redirectHeaders.set('Content-Type', mime.lookup(newUrl.toString()))
      }
      redirectHeaders.set('X-helia-sw', 'redirected')
      const redirectResponse = new Response(null, {
        status: 308,
        headers: redirectHeaders
      })
      event.respondWith(redirectResponse)
    } else {
      console.log('not rerouting request to same url: ', newUrl.toString())

      event.respondWith(fetchHandler({ url, request }))
    }
  } else if (isRootRequestForContent(event)) {
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
