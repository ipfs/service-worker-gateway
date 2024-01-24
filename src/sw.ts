/* eslint-disable @typescript-eslint/strict-boolean-expressions */
// import { clientsClaim } from 'workbox-core'
import type { Helia } from '@helia/interface'

import { getHelia } from './get-helia.ts'
import { heliaFetch } from './lib/heliaFetch.ts'
import mime from 'mime-types'

declare let self: ServiceWorkerGlobalScope

let helia: Helia
self.addEventListener('install', () => {
  console.log('sw installing')
  void self.skipWaiting()
})

self.addEventListener('activate', () => {
  console.log('sw activating')
})

const fetchHandler = async ({ url, request }: { url: URL, request: Request }): Promise<Response> => {
  if (helia == null) {
    helia = await getHelia()
  }

  // 2 second timeout - for debugging
  // const abortController = new AbortAbort({ timeout: 2 * 1000 })

  /**
   * Note that there are existing bugs regarding service worker signal handling:
   * * https://bugs.chromium.org/p/chromium/issues/detail?id=823697
   * * https://bugzilla.mozilla.org/show_bug.cgi?id=1394102
   */
  // 5 minute timeout
  const abortController = AbortSignal.timeout(5 * 60 * 1000)
  try {
    return await heliaFetch({ path: url.pathname, helia, signal: abortController, headers: request.headers })
  } catch (err: unknown) {
    console.error('fetchHandler error: ', err)
    const errorMessage = err instanceof Error ? err.message : JSON.stringify(err)

    if (errorMessage.includes('aborted')) {
      return new Response('heliaFetch error aborted due to timeout: ' + errorMessage, { status: 408 })
    }
    return new Response('heliaFetch error: ' + errorMessage, { status: 500 })
  }
}
const urlInterceptRegex = [new RegExp(`${self.location.origin}/ip(n|f)s/`)]

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
