import { AbortError, setMaxListeners } from '@libp2p/interface'
import { getConfig } from './lib/config-db.js'
import { HASH_FRAGMENTS, QUERY_PARAMS } from './lib/constants.js'
import { errorToObject } from './lib/error-to-object.js'
import { getHeliaSwRedirectUrl } from './lib/first-hit-helpers.js'
import { GenericIDB } from './lib/generic-db.js'
import { getSubdomainParts } from './lib/get-subdomain-parts.js'
import { getVerifiedFetch, logEmitter } from './lib/get-verified-fetch.js'
import { hasHashFragment } from './lib/hash-fragments.js'
import { isConfigPage } from './lib/is-config-page.js'
import { getSwLogger } from './lib/logger.js'
import { findOriginIsolationRedirect, isPathGatewayRequest, isSubdomainGatewayRequest } from './lib/path-or-subdomain.js'
import { isBitswapProvider, isTrustlessGatewayProvider } from './lib/providers.js'
import { isUnregisterRequest } from './lib/unregister-request.js'
import { APP_VERSION, GIT_REVISION } from './version.js'
import type { ConfigDb } from './lib/config-db.js'
import type { Providers as ErrorPageProviders } from './pages/errors/fetch-error.jsx'
import type { VerifiedFetch, VerifiedFetchInit } from '@helia/verified-fetch'

/**
 ******************************************************
 * Types
 ******************************************************
 */

interface FetchHandlerArg {
  path: string
  request: Request
  event: FetchEvent
  logs: string[]
}

interface StoreResponseInCacheOptions {
  response: Response
  cacheKey: string
  isMutable: boolean
  event: FetchEvent
}

/**
 * IndexedDB schema for each registered service worker
 *
 * NOTE: this is not intended to be shared between service workers, unlike the
 * default used by config-db.ts
 */
interface LocalSwConfig {
  installTimestamp: number
  originIsolationWarningAccepted: boolean
}

/**
 * When returning a meaningful error page, we provide the following details about
 * the service worker
 */
interface ServiceWorkerDetails {
  config: ConfigDb
  crossOriginIsolated: boolean
  installTime: string
  origin: string
  scope: string
  state: string
  version: string
  commit: string
}

/**
 * These are block/car providers that were used while downloading data
 */
interface Providers {
  total: number
  bitswap: Map<string, Set<string>>
  trustlessGateway: Set<string>

  // this is limited to 5x entries to prevent new routing systems causing OOMs
  other: any[]
  otherCount: number
}

/**
 ******************************************************
 * "globals"
 ******************************************************
 */
declare let self: ServiceWorkerGlobalScope
// const log = swLogger.forComponent('main')

/**
 * This is one best practice that can be followed in general to keep track of
 * multiple caches used by a given service worker, and keep them all versioned.
 * It maps a shorthand identifier for a cache to a specific, versioned cache name.
 *
 * Note that since global state is discarded in between service worker restarts, these
 * variables will be reinitialized each time the service worker handles an event, and you
 * should not attempt to change their values inside an event handler. (Treat them as constants.)
 *
 * If at any point you want to force pages that use this service worker to start using a fresh
 * cache, then increment the CACHE_VERSION value. It will kick off the service worker update
 * flow and the old cache(s) will be purged as part of the activate event handler when the
 * updated service worker is activated.
 *
 * @see https://googlechrome.github.io/samples/service-worker/prefetch-video/
 */
const CACHE_VERSION = 2 // see https://github.com/ipfs/service-worker-gateway/pull/853#issuecomment-3309246532
const CURRENT_CACHES = Object.freeze({
  mutable: `mutable-cache-v${CACHE_VERSION}`,
  immutable: `immutable-cache-v${CACHE_VERSION}`,
  swAssets: `sw-assets-v${CACHE_VERSION}`
})
let verifiedFetch: VerifiedFetch
const ONE_HOUR_IN_SECONDS = 3600
const urlInterceptRegex = [new RegExp(`${self.location.origin}/ip(n|f)s/`)]
let config: ConfigDb

const updateConfig = async (): Promise<void> => {
  config = await getConfig(getSwLogger('update-config'))
}

async function updateVerifiedFetch (): Promise<void> {
  await updateConfig()

  verifiedFetch = await getVerifiedFetch(config, getSwLogger('update-verified-fetch'))
}

let swIdb: GenericIDB<LocalSwConfig>
let firstInstallTime: number
const getSwConfig = (): GenericIDB<LocalSwConfig> => {
  if (typeof swIdb === 'undefined') {
    swIdb = new GenericIDB<LocalSwConfig>('helia-sw-unique', 'config')
  }

  return swIdb
}

/**
 ******************************************************
 * Service Worker Lifecycle Events
 ******************************************************
 */
self.addEventListener('install', (event) => {
  // 👇 When a new version of the SW is installed, activate immediately
  void self.skipWaiting()
  event.waitUntil(addInstallTimestampToConfig())
  event.waitUntil(clearSwAssetCache())
})

self.addEventListener('activate', (event) => {
  const log = getSwLogger('activate')

  // ensure verifiedFetch is ready for use
  // event.waitUntil(updateVerifiedFetch())
  /**
   * 👇 Claim all clients immediately. This handles the case when subdomain is
   * loaded for the first time, and config is updated and then a pre-fetch is
   * sent (await fetch(window.location.href, { method: 'GET' })) to start
   * loading the content prior the user reloading or clicking the "load content"
   * button.
   */
  event.waitUntil(self.clients.claim())

  // eslint-disable-next-line no-console
  console.info('Service Worker Gateway: To manually unregister, append "?ipfs-sw-unregister=true" to the URL, or use the button on the config page.')

  // Delete all caches that aren't named in CURRENT_CACHES.
  const expectedCacheNames = Object.keys(CURRENT_CACHES).map(function (key) {
    return CURRENT_CACHES[key as keyof typeof CURRENT_CACHES]
  })

  event.waitUntil(
    caches.keys()
      .then(async function (cacheNames) {
        return Promise.all(
          cacheNames.map(async function (cacheName) {
            if (!expectedCacheNames.includes(cacheName as (typeof CURRENT_CACHES)[keyof typeof CURRENT_CACHES])) {
              // If this cache name isn't present in the array of "expected" cache names, then delete it.
              log('deleting out of date cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .catch(err => {
        log.error('could not delete out of date cache - %e', err)
      })
  )
})

self.addEventListener('fetch', (event) => {
  const log = getSwLogger('fetch')

  const request = event.request
  const urlString = request.url
  const url = new URL(urlString)

  if (firstInstallTime == null) {
    // if service worker is shut down, the firstInstallTime may be null
    log('firstInstallTime is null, getting install timestamp')
    event.waitUntil(getInstallTimestamp())
  }

  log.trace('incoming request url: %s:', event.request.url)

  event.waitUntil(requestRouting(event, url).then(async (shouldHandle) => {
    if (shouldHandle) {
      log.trace('handling request for %s', url)

      // collect logs from Helia/libp2p during the fetch operation
      const logs: string[] = []

      function onLog (event: CustomEvent<string>): void {
        logs.push(event.detail)
      }

      logEmitter.addEventListener('log', onLog)

      event.respondWith(getResponseFromCacheOrFetch(event, logs)
        .then(async (response) => {
          if (!isServiceWorkerRegistrationTTLValid()) {
            log('Service worker registration TTL expired, unregistering service worker')
            const clonedResponse = response.clone()
            event.waitUntil(
              clonedResponse.blob().then(() => {
                log('Service worker registration TTL expired, unregistering after response consumed')
              }).finally(() => self.registration.unregister())
            )

            return response
          }

          return response
        })
        .finally(() => {
          logEmitter.removeEventListener('log', onLog)
        }))
    } else {
      log.trace('not handling request for %s', url)
    }
  }))
})

/**
 ******************************************************
 * Functions
 ******************************************************
 */
async function requestRouting (event: FetchEvent, url: URL): Promise<boolean> {
  const log = getSwLogger('request-routing')

  if (isUnregisterRequest(event.request.url)) {
    event.waitUntil(self.registration.unregister())
    event.respondWith(new Response('Service worker unregistered', {
      status: 200
    }))

    return false
  } else if (isSubdomainConfigRequest(event)) {
    log.trace('subdomain config request, ignoring and letting index.html handle it %s', event.request.url)

    return false
  } else if (isConfigPageRequest(url)) {
    log.trace('config page request, ignoring %s', event.request.url)

    return false
  } else if (isSwConfigReloadRequest(event)) {
    log.trace('sw-config reload request, updating verifiedFetch')

    // Wait for the update to complete before sending response
    event.respondWith(
      updateVerifiedFetch()
        .then(() => {
          log.trace('sw-config reload request, verifiedFetch updated')
          return new Response('sw-config reload request, verifiedFetch updated', {
            status: 200
          })
        })
        .catch((err) => {
          log.error('sw-config reload request, error updating verifiedFetch - %e', err)
          return new Response('Failed to update verifiedFetch: ' + err.message, {
            status: 500
          })
        })
    )

    return false
  } else if (isAcceptOriginIsolationWarningRequest(event)) {
    event.waitUntil(setOriginIsolationWarningAccepted().then(() => {
      log.trace('origin isolation warning accepted')
    }).catch((err) => {
      log.error('origin isolation warning accepted, error', err)
    }))

    return false
  } else if (isSwConfigGETRequest(event)) {
    // TODO: remove? I don't think we need this anymore.
    log.trace('sw-config GET request')
    // event.waitUntil(new Promise<void>((resolve) => {
    event.respondWith(new Promise<Response>((resolve) => {
      resolve(new Response(JSON.stringify(config), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }))
    }))

    return false
  } else if (isSwAssetRequest(event)) {
    log.trace('sw-asset request, returning cached response ', event.request.url)
    /**
     * Return the asset from the cache if it exists, otherwise fetch it.
     */
    event.respondWith(caches.open(CURRENT_CACHES.swAssets).then(async (cache) => {
      try {
        const cachedResponse = await cache.match(event.request)

        if (cachedResponse != null) {
          return cachedResponse
        }
      } catch (err) {
        log.error('error matching cached response - %e', err)
      }

      let response: Response

      try {
        response = await fetch(event.request)
      } catch (err) {
        log.error('error fetching response - %e', err)

        return new Response('No response', {
          status: 500,
          headers: {
            'x-debug-request-uri': event.request.url
          }
        })
      }

      try {
        await cache.put(event.request, response.clone())
        return response
      } catch (err) {
        log.error('error caching response - %e', err)
      }
      return response
    }))

    return false
  } else if (!isValidRequestForSW(event)) {
    log.trace('not a valid request for helia-sw, ignoring ', event.request.url)
    return false
  } else if (url.href.includes('bafkqaaa.ipfs')) {
    /**
     * `bafkqaaa` is an empty inline CID, so this response *is* valid, and prevents additional network calls.
     *
     * @see https://github.com/ipfs-shipyard/helia-service-worker-gateway/pull/151#discussion_r1536562347
     */
    event.respondWith(new Response('', { status: 200 }))
    return false
  }

  if (isRootRequestForContent(event) || isSubdomainRequest(event)) {
    return true
  }

  return false
}

function isRootRequestForContent (event: FetchEvent): boolean {
  const urlIsPreviouslyIntercepted = urlInterceptRegex.some(regex => regex.test(event.request.url))
  const isRootRequest = urlIsPreviouslyIntercepted
  return isRootRequest // && getCidFromUrl(event.request.url) != null
}

function isSubdomainRequest (event: FetchEvent): boolean {
  const log = getSwLogger('is-subdomain-request')

  const { id, protocol } = getSubdomainParts(event.request.url)
  log.trace('isSubdomainRequest.id: ', id)
  log.trace('isSubdomainRequest.protocol: ', protocol)

  return id != null && protocol != null
}

function isConfigPageRequest (url: URL): boolean {
  return isConfigPage(url.hash)
}

function isSubdomainConfigRequest (event: FetchEvent): boolean {
  const url = new URL(event.request.url)
  return hasHashFragment(url, HASH_FRAGMENTS.IPFS_SW_SUBDOMAIN_REQUEST)
}

function isValidRequestForSW (event: FetchEvent): boolean {
  return isSubdomainRequest(event) || isRootRequestForContent(event)
}

function isSwConfigReloadRequest (event: FetchEvent): boolean {
  const url = new URL(event.request.url)
  return url.pathname.includes('/#/ipfs-sw-config-reload') || url.searchParams.get('ipfs-sw-config-reload') === 'true'
}

function isSwConfigGETRequest (event: FetchEvent): boolean {
  const url = new URL(event.request.url)
  return url.pathname.includes('/#/ipfs-sw-config-get') || url.searchParams.get('ipfs-sw-config-get') === 'true'
}

function isAcceptOriginIsolationWarningRequest (event: FetchEvent): boolean {
  const url = new URL(event.request.url)
  return url.pathname.includes('/#/ipfs-sw-accept-origin-isolation-warning') || url.searchParams.get('ipfs-sw-accept-origin-isolation-warning') === 'true'
}

function isSwAssetRequest (event: FetchEvent): boolean {
  const isActualSwAsset = /^.+\/(?:ipfs-sw-).+$/.test(event.request.url)
  // if path is not set, then it's a request for index.html which we should consider a sw asset
  const url = new URL(event.request.url)
  // but only if it's not a subdomain request (root index.html should not be returned for subdomains)
  const isIndexHtmlRequest = url.pathname === '/' && !isSubdomainRequest(event)

  return isActualSwAsset || isIndexHtmlRequest
}

/**
 * Set the expires header on a response object to a timestamp based on the passed ttl interval
 * Defaults to
 */
function setExpiresHeader (response: Response, ttlSeconds: number = ONE_HOUR_IN_SECONDS): void {
  const expirationTime = new Date(Date.now() + ttlSeconds * 1000)

  response.headers.set('sw-cache-expires', expirationTime.toUTCString())
}

/**
 * Checks whether a cached response object has expired by looking at the expires header
 * Note that this ignores the Cache-Control header since the expires header is set by us
 */
function hasExpired (response: Response): boolean {
  const expiresHeader = response.headers.get('sw-cache-expires')

  if (expiresHeader == null) {
    return false
  }

  const expires = new Date(expiresHeader)
  const now = new Date()

  return expires < now
}

function getCacheKey (event: FetchEvent): string {
  return `${event.request.url}-${event.request.headers.get('Accept') ?? ''}`
}

async function fetchAndUpdateCache (event: FetchEvent, url: URL, cacheKey: string, logs: string[]): Promise<Response> {
  const log = getSwLogger('fetch-and-update-cache')

  const response = await fetchHandler({ path: url.pathname, request: event.request, event, logs })
  log.trace('got response from fetchHandler')

  // log all of the headers:
  response.headers.forEach((value, key) => {
    log.trace('response headers: %s: %s', key, value)
  })

  log('response status: %s', response.status)

  try {
    await storeResponseInCache({ response, isMutable: true, cacheKey, event })
    log.trace('updated cache for %s', cacheKey)
  } catch (err) {
    log.error('failed updating response in cache for %s - %e', cacheKey, err)
  }

  return response
}

async function getResponseFromCacheOrFetch (event: FetchEvent, logs: string[]): Promise<Response> {
  const log = getSwLogger('get-response-from-cache-or-fetch')

  const { protocol } = getSubdomainParts(event.request.url)
  const url = new URL(event.request.url)
  const isMutable = protocol === 'ipns'
  const cacheKey = getCacheKey(event)
  log.trace('cache key: %s', cacheKey)
  const cache = await caches.open(isMutable ? CURRENT_CACHES.mutable : CURRENT_CACHES.immutable)
  const cachedResponse = await cache.match(cacheKey)
  const validCacheHit = cachedResponse != null && !hasExpired(cachedResponse)

  if (validCacheHit) {
    log('cached response HIT for %s (expires: %s) %o', cacheKey, cachedResponse.headers.get('sw-cache-expires'), cachedResponse)

    if (isMutable) {
      // If the response is mutable, update the cache in the background.
      void fetchAndUpdateCache(event, url, cacheKey, logs)
    }

    return cachedResponse
  }

  log('cached response MISS for %s', cacheKey)

  return fetchAndUpdateCache(event, url, cacheKey, logs)
}

function shouldCacheResponse ({ event, response }: { event: FetchEvent, response: Response }): boolean {
  const log = getSwLogger('should-cache-response')

  if (!response.ok) {
    log.trace('response not ok, not caching %o', response)
    return false
  }

  const statusCodesToNotCache = [206]

  if (statusCodesToNotCache.some(code => code === response.status)) {
    log.trace('not caching response with status %s', response.status)
    return false
  }

  if (event.request.headers.get('pragma') === 'no-cache' || event.request.headers.get('cache-control') === 'no-cache') {
    log.trace('request indicated no-cache, not caching')
    return false
  }

  return true
}

async function storeResponseInCache ({ response, isMutable, cacheKey, event }: StoreResponseInCacheOptions): Promise<void> {
  const log = getSwLogger('store-response-in-cache')

  if (!shouldCacheResponse({ event, response })) {
    return
  }

  log.trace('updating cache for %s in the background', cacheKey)

  const cache = await caches.open(isMutable ? CURRENT_CACHES.mutable : CURRENT_CACHES.immutable)

  // Clone the response since streams can only be consumed once.
  const respToCache = response.clone()

  if (isMutable) {
    log.trace('setting expires header on response key %s before storing in cache', cacheKey)
    // 👇 Set expires header to an hour from now for mutable (ipns://) resources
    // Note that this technically breaks HTTP semantics, whereby the cache-control max-age takes precendence
    // Setting this header is only used by the service worker using a mechanism similar to stale-while-revalidate
    setExpiresHeader(respToCache, ONE_HOUR_IN_SECONDS)
  }

  log('storing response for key %s in cache', cacheKey)
  // do not await this.. large responses will delay [TTFB](https://web.dev/articles/ttfb) and [TTI](https://web.dev/articles/tti)

  try {
    void cache.put(cacheKey, respToCache).catch((err) => {
      log.error('error storing response in cache - %e', err)
    })
  } catch (err) {
    log.error('error storing response in cache - %e', err)
  }
}

async function fetchHandler ({ request, event, logs }: FetchHandlerArg): Promise<Response> {
  const log = getSwLogger('fetch-handler')

  const originalUrl = new URL(request.url)

  // test and enforce origin isolation before anything else is executed
  const originLocation = await findOriginIsolationRedirect(originalUrl, log)

  if (originLocation !== null) {
    log.trace('redirecting to subdomain')
    return new Response('Gateway supports subdomain mode, redirecting to ensure Origin isolation..', {
      status: 301,
      headers: {
        'Content-Type': 'text/plain',
        Location: originLocation
      }
    })
  } else if (!isSubdomainGatewayRequest(originalUrl) && isPathGatewayRequest(originalUrl) && !(await getOriginIsolationWarningAccepted()) && !originalUrl.searchParams.has(QUERY_PARAMS.HELIA_SW)) {
    log.trace('showing origin isolation warning')
    const newUrl = new URL(originalUrl.href)
    newUrl.pathname = '/'
    newUrl.hash = '/ipfs-sw-origin-isolation-warning'

    const redirectUrl = getHeliaSwRedirectUrl(originalUrl, newUrl)

    return new Response('Origin isolation is not supported, please accept the risk to continue.', {
      status: 307,
      headers: {
        'Content-Type': 'text/plain',
        Location: redirectUrl.href
      }
    })
  }

  /**
   * > Any global variables you set will be lost if the service worker shuts down.
   *
   * @see https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle
   */
  if (verifiedFetch == null) {
    await updateVerifiedFetch()
  }

  /**
   * Note that there are existing bugs regarding service worker signal handling:
   * https://bugs.chromium.org/p/chromium/issues/detail?id=823697
   * https://bugzilla.mozilla.org/show_bug.cgi?id=1394102
   */
  const timeoutSignal = AbortSignal.timeout(config.fetchTimeout)
  const signal = AbortSignal.any([
    event.request.signal,
    timeoutSignal
  ])
  setMaxListeners(Infinity, signal)

  const providers: Providers = {
    total: 0,
    bitswap: new Map(),
    trustlessGateway: new Set(),
    other: [],
    otherCount: 0
  }

  const resource = new URL(event.request.url).href
  const init: VerifiedFetchInit = {
    signal,
    headers: request.headers,
    redirect: 'manual',
    onProgress: (evt) => {
      if (evt.type.endsWith(':found-provider')) {
        providers.total++

        if (isBitswapProvider(evt.detail)) {
          // store deduplicated peer multiaddrs
          const mas = providers.bitswap.get(evt.detail.provider.id.toString()) ?? new Set()
          evt.detail.provider.multiaddrs.forEach(ma => mas.add(ma.toString()))
          providers.bitswap.set(evt.detail.provider.id.toString(), mas)
        } else if (isTrustlessGatewayProvider(evt.detail)) {
          providers.trustlessGateway.add(evt.detail.url)
        } else {
          providers.other.push(evt.detail)
          providers.otherCount++

          // truncate unknown routing providers if there are too many
          if (providers.other.length > 5) {
            providers.other.length = 5
          }
        }
      }
    }
  }
  const start = Date.now()

  try {
    const response = await verifiedFetch(resource, init)
    response.headers.set('ipfs-sw', 'true')

    log('GET %s %d', resource, response.status, response.statusText)

    /**
     * Now that we've got a response back from Helia, don't abort the promise
     * since any additional networking calls that may performed by Helia would
     * be dropped.
     *
     * If `event.request.signal` is aborted, that would cancel any underlying
     * network requests.
     *
     * Note: we haven't awaited the arrayBuffer, blob, json, etc.
     * `await verifiedFetch` only awaits the construction of the response
     * object, regardless of it's inner content
     */
    if (!response.ok) {
      return errorPageResponse(resource, init, response, await response.text(), providers, logs)
    }

    // Create a completely new response object with the same body, status,
    // statusText, and headers.
    //
    // This is necessary to work around a bug with Safari not rendering
    // content correctly.
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
      statusText: response.statusText
    })
  } catch (err: any) {
    if (timeoutSignal.aborted) {
      return errorPageResponse(resource, init, new Response('', {
        status: 504,
        statusText: 'Gateway Timeout',
        headers: {
          'Content-Type': 'application/json'
        }
      }), JSON.stringify(errorToObject(new AbortError(`Timed out after ${Date.now() - start}ms`)), null, 2), providers, logs)
    }

    if (event.request.signal.aborted) {
      // the request was cancelled?
    }

    log.error('error during request - %e', err)

    return errorPageResponse(resource, init, new Response('', {
      status: 500,
      statusText: 'Internal Server Error',
      headers: {
        'Content-Type': 'application/json'
      }
    }), JSON.stringify(errorToObject(err), null, 2), providers, logs)
  }
}

/**
 * Shows an error page to the user
 */
function errorPageResponse (resource: string, request: RequestInit, fetchResponse: Response, responseBody: string, providers: Providers, logs: string[]): Response {
  const responseContentType = fetchResponse.headers.get('Content-Type')

  if (responseContentType?.includes('text/html')) {
    return fetchResponse
  }

  const responseDetails = getResponseDetails(fetchResponse, responseBody)
  const mergedHeaders = new Headers(fetchResponse.headers)
  mergedHeaders.set('Content-Type', 'text/html')
  mergedHeaders.set('ipfs-sw', 'true')

  const props = {
    request: getRequestDetails(resource, request),
    response: responseDetails,
    config: getServiceWorkerDetails(),
    providers: toErrorPageProviders(providers),
    title: `${responseDetails.status} ${responseDetails.statusText}`,
    logs
  }

  const page = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charSet='utf-8' />
    <meta name='viewport' content='width=device-width, initial-scale=1.0' />
    <link rel='shortcut icon' href='data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlo89/56ZQ/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACUjDu1lo89/6mhTP+zrVP/nplD/5+aRK8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHNiIS6Wjz3/ubFY/761W/+vp1D/urRZ/8vDZf/GvmH/nplD/1BNIm8AAAAAAAAAAAAAAAAAAAAAAAAAAJaPPf+knEj/vrVb/761W/++tVv/r6dQ/7q0Wf/Lw2X/y8Nl/8vDZf+tpk7/nplD/wAAAAAAAAAAAAAAAJaPPf+2rVX/vrVb/761W/++tVv/vrVb/6+nUP+6tFn/y8Nl/8vDZf/Lw2X/y8Nl/8G6Xv+emUP/AAAAAAAAAACWjz3/vrVb/761W/++tVv/vrVb/761W/+vp1D/urRZ/8vDZf/Lw2X/y8Nl/8vDZf/Lw2X/nplD/wAAAAAAAAAAlo89/761W/++tVv/vrVb/761W/++tVv/r6dQ/7q0Wf/Lw2X/y8Nl/8vDZf/Lw2X/y8Nl/56ZQ/8AAAAAAAAAAJaPPf++tVv/vrVb/761W/++tVv/vbRa/5aPPf+emUP/y8Nl/8vDZf/Lw2X/y8Nl/8vDZf+emUP/AAAAAAAAAACWjz3/vrVb/761W/++tVv/vrVb/5qTQP+inkb/op5G/6KdRv/Lw2X/y8Nl/8vDZf/Lw2X/nplD/wAAAAAAAAAAlo89/761W/++tVv/sqlS/56ZQ//LxWb/0Mlp/9DJaf/Kw2X/oJtE/7+3XP/Lw2X/y8Nl/56ZQ/8AAAAAAAAAAJaPPf+9tFr/mJE+/7GsUv/Rymr/0cpq/9HKav/Rymr/0cpq/9HKav+xrFL/nplD/8vDZf+emUP/AAAAAAAAAACWjz3/op5G/9HKav/Rymr/0cpq/9HKav/Rymr/0cpq/9HKav/Rymr/0cpq/9HKav+inkb/nplD/wAAAAAAAAAAAAAAAKKeRv+3slb/0cpq/9HKav/Rymr/0cpq/9HKav/Rymr/0cpq/9HKav+1sFX/op5G/wAAAAAAAAAAAAAAAAAAAAAAAAAAop5GUKKeRv/Nxmf/0cpq/9HKav/Rymr/0cpq/83GZ/+inkb/op5GSAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAop5G16KeRv/LxWb/y8Vm/6KeRv+inkaPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAop5G/6KeRtcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/n8AAPgfAADwDwAAwAMAAIABAACAAQAAgAEAAIABAACAAQAAgAEAAIABAACAAQAAwAMAAPAPAAD4HwAA/n8AAA==' />
    <title>${props.title}</title>
    <link rel="stylesheet" href="<%-- src/app.css --%>">
    <script type="text/javascript">
globalThis.props = ${JSON.stringify(props, null, 2)}
    </script>
  </head>
  <body class="san-serif charcoal">
    <div id="app"></div>
    <script type="text/javascript" src="<%-- src/error.tsx --%>"></script>
  </body>
</html>
`

  return new Response(page, {
    status: fetchResponse.status,
    statusText: fetchResponse.statusText,
    headers: mergedHeaders
  })
}

/**
 * TODO: more service worker details
 */
function getServiceWorkerDetails (): ServiceWorkerDetails {
  const registration = self.registration
  const state = registration.installing?.state ?? registration.waiting?.state ?? registration.active?.state ?? 'unknown'

  return {
    config,
    // TODO: implement https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Opener-Policy
    crossOriginIsolated: self.crossOriginIsolated,
    installTime: (new Date(firstInstallTime)).toUTCString(),
    origin: self.location.origin,
    scope: registration.scope,
    state,
    version: APP_VERSION,
    commit: GIT_REVISION
  }
}

function toErrorPageProviders (providers: Providers): ErrorPageProviders {
  const output: ErrorPageProviders = {
    total: providers.total,
    other: providers.other,
    otherCount: providers.otherCount,
    trustlessGateway: [...providers.trustlessGateway],
    bitswap: {}
  }

  for (const [key, addresses] of providers.bitswap) {
    output.bitswap[key] = [...addresses]
  }

  return output
}

export interface RequestDetails {
  resource: string
  method: string
  headers: Record<string, string>
}

function getRequestDetails (resource: string, init: RequestInit): RequestDetails {
  const requestHeaders = new Headers(init.headers)
  const headers: Record<string, string> = {}
  requestHeaders.forEach((value, key) => {
    headers[key] = value
  })

  return {
    resource,
    method: init.method ?? 'GET',
    headers
  }
}

export interface ResponseDetails {
  resource: string,
  headers: Record<string, string>
  status: number
  statusText: string
  body: string
}

function getResponseDetails (response: Response, body: string): ResponseDetails {
  const headers: Record<string, string> = {}
  response.headers.forEach((value, key) => {
    headers[key] = value
  })

  return {
    resource: response.url,
    headers,
    status: response.status,
    statusText: response.statusText,
    body
  }
}

function isServiceWorkerRegistrationTTLValid (): boolean {
  if (!navigator.onLine) {
    /**
     * When we unregister the service worker, the a new one will be installed on the next page load.
     *
     * Note: returning true here means if the user is not online, we will not unregister the service worker.
     * However, browsers will have `navigator.onLine === true` if connected to a LAN that is not internet-connected,
     * so we may want to be smarter about this in the future.
     *
     * @see https://github.com/ipfs/service-worker-gateway/issues/724
     */
    return true
  }
  if (firstInstallTime == null || config?.serviceWorkerRegistrationTTL == null) {
    // no firstInstallTime or serviceWorkerRegistrationTTL, assume new and valid
    return true
  }

  const now = Date.now()
  return now - firstInstallTime <= config.serviceWorkerRegistrationTTL
}

async function getInstallTimestamp (): Promise<number> {
  const log = getSwLogger('get-install-timestamp')

  try {
    const swidb = getSwConfig()
    await swidb.open()
    firstInstallTime = await swidb.get('installTimestamp')
    swidb.close()
    return firstInstallTime
  } catch (err) {
    log.error('getInstallTimestamp error = %e', err)
    return 0
  }
}

async function addInstallTimestampToConfig (): Promise<void> {
  const log = getSwLogger('add-install-timestamp-to-config')

  try {
    const timestamp = Date.now()
    firstInstallTime = timestamp
    const swidb = getSwConfig()
    await swidb.open()
    await swidb.put('installTimestamp', timestamp)
    swidb.close()
  } catch (err) {
    log.error('addInstallTimestampToConfig error - %e', err)
  }
}

async function setOriginIsolationWarningAccepted (): Promise<void> {
  const log = getSwLogger('set-origin-isolation-warning-accepted')

  try {
    const swidb = getSwConfig()
    await swidb.open()
    await swidb.put('originIsolationWarningAccepted', true)
    swidb.close()
  } catch (err) {
    log.error('setOriginIsolationWarningAccepted error - %e', err)
  }
}

async function getOriginIsolationWarningAccepted (): Promise<boolean> {
  const log = getSwLogger('get-origin-isolation-warning-accepted')

  try {
    const swidb = getSwConfig()
    await swidb.open()
    const accepted = await swidb.get('originIsolationWarningAccepted')
    swidb.close()
    return accepted ?? false
  } catch (err) {
    log.error('getOriginIsolationWarningAccepted error - %e', err)
    return false
  }
}

/**
 * To be called on 'install' sw event. This will clear out the old swAssets cache,
 * which is used for storing the service worker's css,js, and html assets.
 */
async function clearSwAssetCache (): Promise<void> {
  const log = getSwLogger('clear-sw-asset-cache')

  // clear out old swAssets cache
  const cacheName = CURRENT_CACHES.swAssets
  const cache = await caches.open(cacheName)

  try {
    const keys = await cache.keys()
    for (const request of keys) {
      await cache.delete(request)
    }
  } catch (err) {
    log.error('could not clear SW asset cache - %e', err)
  }
}
