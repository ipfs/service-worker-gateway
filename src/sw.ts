/* eslint-disable @typescript-eslint/strict-boolean-expressions, no-console */
// import { clientsClaim } from 'workbox-core'
import mime from 'mime-types'
import { getHelia } from './get-helia.ts'
import { dnsLinkLabelDecoder, isInlinedDnsLink } from './lib/dns-link-labels.ts'
import { heliaFetch } from './lib/heliaFetch.ts'
import type { Helia } from '@helia/interface'

declare let self: ServiceWorkerGlobalScope

let helia: Helia
self.addEventListener('install', () => {
  console.log('sw installing')
  void self.skipWaiting()
})

self.addEventListener('activate', () => {
  console.log('sw activating')
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
    const { id, protocol } = getSubdomainParts(request)
    return await heliaFetch({ path, helia, signal: abortController, headers: request.headers, id, protocol })
  } catch (err: unknown) {
    const errorMessages: string[] = []
    if (isAggregateError(err)) {
      console.error('fetchHandler aggregate error: ', err.message)
      for (const e of err.errors) {
        errorMessages.push(e.message)
        console.error('fetchHandler errors: ', e)
      }
    } else {
      errorMessages.push(err instanceof Error ? err.message : JSON.stringify(err))
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

function getSubdomainParts (request: Request): { id: string | null, protocol: string | null } {
  const urlString = request.url
  const labels = new URL(urlString).hostname.split('.')
  let id: string | null = null; let protocol: string | null = null

  // DNS label inspection happens from from right to left
  // to work fine with edge cases like docs.ipfs.tech.ipns.foo.localhost
  for (let i = labels.length - 1; i >= 0; i--) {
    if (labels[i].startsWith('ipfs') || labels[i].startsWith('ipns')) {
      protocol = labels[i]
      id = labels.slice(0, i).join('.')
      if (protocol === 'ipns' && isInlinedDnsLink(id)) {
        // un-inline DNSLink names according to https://specs.ipfs.tech/http-gateways/subdomain-gateway/#host-request-header
        id = dnsLinkLabelDecoder(id)
      }
      break
    }
  }

  return { id, protocol }
}

function isSubdomainRequest (event: FetchEvent): boolean {
  const { id, protocol } = getSubdomainParts(event.request)
  console.log('isSubdomainRequest.id: ', id)
  console.log('isSubdomainRequest.protocol: ', protocol)

  return id != null && protocol != null
}

const isValidRequestForSW = (event: FetchEvent): boolean =>
  isSubdomainRequest(event) || isRootRequestForContent(event) || isReferrerPreviouslyIntercepted(event)

self.addEventListener('fetch', event => {
  const request = event.request
  const urlString = request.url
  const url = new URL(urlString)
  console.log('helia-sw: urlString: ', urlString)

  if (urlString.includes('?helia-sw-subdomain')) {
    console.log('helia-sw: subdomain request: ', urlString)
    // subdomain request where URL has <subdomain>.ip[fn]s and any paths should be appended to the url
    // const subdomain = url.searchParams.get('helia-sw-subdomain')
    // console.log('url.href: ', url.href)
    // const path = `${url.searchParams.get('helia-sw-subdomain')}/${url.pathname}`
    event.respondWith(fetchHandler({ path: url.pathname, request }))
    return
  }
  if (!isValidRequestForSW(event)) {
    console.warn('helia-sw: not a valid request for helia-sw, ignoring ', urlString)
    return
  }
  // console.log('request: ', request)
  // console.log('self.location.origin: ', self.location.origin)
  console.log('helia-sw: intercepting request to ', urlString)
  if (isReferrerPreviouslyIntercepted(event)) {
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

    /**
     * respond with redirect to newUrl
     */
    if (newUrl.toString() !== urlString) {
      console.log('helia-sw: rerouting request to: ', newUrl.toString())
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
