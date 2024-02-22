import mime from 'mime-types'
import { getHelia } from './get-helia.ts'
import { HeliaServiceWorkerCommsChannel, type ChannelMessage } from './lib/channel.ts'
import { heliaFetch } from './lib/heliaFetch.ts'
import { BASE_URL } from './lib/webpack-constants.ts'
import type { Helia } from '@helia/interface'

declare let self: ServiceWorkerGlobalScope

let helia: Helia
self.addEventListener('install', () => {
  void self.skipWaiting()
})

const channel = new HeliaServiceWorkerCommsChannel('SW')

self.addEventListener('activate', () => {
  channel.onmessagefrom('WINDOW', async (message: MessageEvent<ChannelMessage<'WINDOW', null>>) => {
    const { action } = message.data
    switch (action) {
      case 'RELOAD_CONFIG':
        void getHelia().then((newHelia) => {
          helia = newHelia
        })
        break
      default:
        // eslint-disable-next-line no-console
        console.log('unknown action: ', action)
    }
  })
})

/**
 * Not available in ServiceWorkerGlobalScope
 */

interface AggregateError extends Error {
  errors: Error[]
}

function isAggregateError (err: unknown): err is AggregateError {
  return err instanceof Error && (err as AggregateError).errors != null
}

interface FetchHandlerArg {
  path: string
  request: Request

}

const fetchHandler = async ({ path, request }: FetchHandlerArg): Promise<Response> => {
  if (helia == null) {
    helia = await getHelia()
  }

  /**
   * Note that there are existing bugs regarding service worker signal handling:
   * * https://bugs.chromium.org/p/chromium/issues/detail?id=823697
   * * https://bugzilla.mozilla.org/show_bug.cgi?id=1394102
   */
  // 5 minute timeout
  const abortController = AbortSignal.timeout(5 * 60 * 1000)
  try {
    const { origin, protocol } = getSubdomainParts(request)
    return await heliaFetch({ path, helia, signal: abortController, headers: request.headers, origin, protocol })
  } catch (err: unknown) {
    const errorMessages: string[] = []
    if (isAggregateError(err)) {
      // eslint-disable-next-line no-console
      console.error('fetchHandler aggregate error: ', err.message)
      for (const e of err.errors) {
        errorMessages.push(e.message)
        // eslint-disable-next-line no-console
        console.error('fetchHandler errors: ', e)
      }
    } else {
      errorMessages.push(err instanceof Error ? err.message : JSON.stringify(err))
      // eslint-disable-next-line no-console
      console.error('fetchHandler error: ', err)
    }
    const errorMessage = errorMessages.join('\n')

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

function getSubdomainParts (request: Request): { origin: string | null, protocol: string | null } {
  const urlString = request.url
  const url = new URL(urlString)
  const subdomain = url.hostname.replace(`.${BASE_URL}`, '')
  const subdomainRegex = /^(?<origin>[^/]+)\.(?<protocol>ip[fn]s)?$/
  const subdomainMatch = subdomain.match(subdomainRegex)
  const { origin, protocol } = subdomainMatch?.groups ?? { origin: null, protocol: null }

  return { origin, protocol }
}

function isSubdomainRequest (event: FetchEvent): boolean {
  const { origin, protocol } = getSubdomainParts(event.request)

  return origin != null && protocol != null
}

const isValidRequestForSW = (event: FetchEvent): boolean =>
  isSubdomainRequest(event) || isRootRequestForContent(event) || isReferrerPreviouslyIntercepted(event)

self.addEventListener('fetch', event => {
  const request = event.request
  const urlString = request.url
  const url = new URL(urlString)
  // eslint-disable-next-line no-console
  console.log('helia-sw: urlString: ', urlString)

  if (urlString.includes('?helia-sw-subdomain')) {
    // eslint-disable-next-line no-console
    console.log('helia-sw: subdomain request: ', urlString)
    // subdomain request where URL has <subdomain>.ip[fn]s and any paths should be appended to the url
    // const subdomain = url.searchParams.get('helia-sw-subdomain')
    // console.log('url.href: ', url.href)
    // const path = `${url.searchParams.get('helia-sw-subdomain')}/${url.pathname}`
    event.respondWith(fetchHandler({ path: url.pathname, request }))
    return
  }
  if (!isValidRequestForSW(event)) {
    // eslint-disable-next-line no-console
    console.warn('helia-sw: not a valid request for helia-sw, ignoring ', urlString)
    return
  }

  // eslint-disable-next-line no-console
  console.log('helia-sw: intercepting request to ', urlString)
  if (isReferrerPreviouslyIntercepted(event)) {
    // eslint-disable-next-line no-console
    console.log('helia-sw: referred from ', request.referrer)
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

    // const { origin, protocol } = getSubdomainParts(event)

    /**
     * respond with redirect to newUrl
     */
    if (newUrl.toString() !== urlString) {
      // eslint-disable-next-line no-console
      console.log('helia-sw: rerouting request to: ', newUrl.toString())
      const redirectHeaders = new Headers()
      redirectHeaders.set('Location', newUrl.toString())
      if (mime.lookup(newUrl.toString()) != null) {
        redirectHeaders.set('Content-Type', mime.lookup(newUrl.toString()))
      }
      redirectHeaders.set('X-helia-sw', 'redirected')
      const redirectResponse = new Response(null, {
        status: 308,
        headers: redirectHeaders
      })
      event.respondWith(redirectResponse)
    } else {
      // eslint-disable-next-line no-console
      console.log('helia-sw: not rerouting request to same url: ', newUrl.toString())

      event.respondWith(fetchHandler({ path: url.pathname, request }))
    }
  } else if (isRootRequestForContent(event)) {
    // intercept and do our own stuff...
    event.respondWith(fetchHandler({ path: url.pathname, request }))
  } else if (isSubdomainRequest(event)) {
    event.respondWith(fetchHandler({ path: url.pathname, request }))
  }
})
