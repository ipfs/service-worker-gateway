import mime from 'mime-types'
import { getVerifiedFetch } from './get-helia.ts'
import { HeliaServiceWorkerCommsChannel, type ChannelMessage } from './lib/channel.ts'
import { getSubdomainParts } from './lib/get-subdomain-parts.ts'
import { getVerifiedFetchUrl, heliaFetch } from './lib/heliaFetch.ts'
import { error, log, trace } from './lib/logger.ts'
import { findOriginIsolationRedirect } from './lib/path-or-subdomain.ts'
import type { VerifiedFetch } from '@helia/verified-fetch'

declare let self: ServiceWorkerGlobalScope

let verifiedFetch: VerifiedFetch

self.addEventListener('install', (event) => {
  // 👇 When a new version of the SW is installed, activate immediately
  void self.skipWaiting()
})

const channel = new HeliaServiceWorkerCommsChannel('SW')

self.addEventListener('activate', () => {
  channel.onmessagefrom('WINDOW', async (message: MessageEvent<ChannelMessage<'WINDOW', null>>) => {
    const { action } = message.data
    switch (action) {
      case 'RELOAD_CONFIG':
        void getVerifiedFetch().then((newVerifiedFetch) => {
          verifiedFetch = newVerifiedFetch
        })
        break
      default:
        log('unknown action: ', action)
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
  // test and enforce origin isolation before anything else is executed
  const originLocation = await findOriginIsolationRedirect(new URL(request.url))
  if (originLocation !== null) {
    const body = 'Gateway supports subdomain mode, redirecting to ensure Origin isolation..'
    return new Response(body, {
      status: 301,
      headers: {
        'Content-Type': 'text/plain',
        Location: originLocation
      }
    })
  }

  /**
   * Note that there are existing bugs regarding service worker signal handling:
   * * https://bugs.chromium.org/p/chromium/issues/detail?id=823697
   * * https://bugzilla.mozilla.org/show_bug.cgi?id=1394102
   */
  // 5 minute timeout
  const abortController = AbortSignal.timeout(5 * 60 * 1000)
  try {
    const { id, protocol } = getSubdomainParts(request.url)
    const verifiedFetchUrl = getVerifiedFetchUrl({ id, protocol, path })
    log('verifiedFetch for ', verifiedFetchUrl)

    return await heliaFetch({ verifiedFetch, verifiedFetchUrl, signal: abortController, headers: request.headers })
  } catch (err: unknown) {
    const errorMessages: string[] = []
    if (isAggregateError(err)) {
      error('fetchHandler aggregate error: ', err.message)
      for (const e of err.errors) {
        errorMessages.push(e.message)
        error('fetchHandler errors: ', e)
      }
    } else {
      errorMessages.push(err instanceof Error ? err.message : JSON.stringify(err))
      error('fetchHandler error: ', err)
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

function isSubdomainRequest (event: FetchEvent): boolean {
  const { id, protocol } = getSubdomainParts(event.request.url)
  trace('isSubdomainRequest.id: ', id)
  trace('isSubdomainRequest.protocol: ', protocol)

  return id != null && protocol != null
}

const isValidRequestForSW = (event: FetchEvent): boolean =>
  isSubdomainRequest(event) || isRootRequestForContent(event) || isReferrerPreviouslyIntercepted(event)

self.addEventListener('fetch', event => {
  const request = event.request
  const urlString = request.url
  const url = new URL(urlString)

  if (!isValidRequestForSW(event)) {
    trace('helia-sw: not a valid request for helia-sw, ignoring ', urlString)
    return
  } else {
    log('helia-sw: valid request for helia-sw: ', urlString)
  }

  if (isReferrerPreviouslyIntercepted(event)) {
    log('helia-sw: referred from ', request.referrer)
    const destinationParts = urlString.split('/')
    const referrerParts = request.referrer.split('/')
    const newParts: string[] = []
    let index = 0
    while (destinationParts[index] === referrerParts[index] && index < destinationParts.length && index < referrerParts.length) {
      newParts.push(destinationParts[index])
      index++
    }
    newParts.push(...referrerParts.slice(index))

    const newUrlString = newParts.join('/') + '/' + destinationParts.slice(index).join('/')
    const newUrl = new URL(newUrlString)

    /**
     * respond with redirect to newUrl
     */
    if (newUrl.toString() !== urlString) {
      log('helia-sw: rerouting request to: ', newUrl.toString())
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
      log('helia-sw: not rerouting request to same url: ', newUrl.toString())

      event.respondWith(fetchHandler({ path: url.pathname, request }))
    }
  } else if (isRootRequestForContent(event)) {
    // intercept and do our own stuff...
    event.respondWith(fetchHandler({ path: url.pathname, request }))
  } else if (isSubdomainRequest(event)) {
    event.respondWith(fetchHandler({ path: url.pathname, request }))
  }
})
