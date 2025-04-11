import { getConfig, type ConfigDb } from './lib/config-db.js'
import { getRedirectUrl, isDeregisterRequest } from './lib/deregister-request.js'
import { getHeliaSwRedirectUrl } from './lib/first-hit-helpers.js'
import { GenericIDB } from './lib/generic-db.js'
import { getSubdomainParts } from './lib/get-subdomain-parts.js'
import { getVerifiedFetch } from './lib/get-verified-fetch.js'
import { isConfigPage } from './lib/is-config-page.js'
import { swLogger } from './lib/logger.js'
import { findOriginIsolationRedirect, isPathGatewayRequest, isSubdomainGatewayRequest } from './lib/path-or-subdomain.js'
import type { VerifiedFetch } from '@helia/verified-fetch'

/**
 ******************************************************
 * Types
 ******************************************************
 */

/**
 * Not available in ServiceWorkerGlobalScope
 */
interface AggregateError extends Error {
  errors: Error[]
}

interface FetchHandlerArg {
  path: string
  request: Request
  event: FetchEvent
}

interface StoreReponseInCacheOptions {
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
}

/**
 * When returning a meaningful error page, we provide the following details about
 * the response that failed
 */
interface ResponseDetails {
  responseBody: string
  headers: Record<string, string>
  status: number
  statusText: string
  url: string
}

/**
 ******************************************************
 * "globals"
 ******************************************************
 */
declare let self: ServiceWorkerGlobalScope
const log = swLogger.forComponent('main')

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
const CACHE_VERSION = 1
const CURRENT_CACHES = Object.freeze({
  mutable: `mutable-cache-v${CACHE_VERSION}`,
  immutable: `immutable-cache-v${CACHE_VERSION}`,
  swAssets: `sw-assets-v${CACHE_VERSION}`
})
let verifiedFetch: VerifiedFetch
const timeoutAbortEventType = 'verified-fetch-timeout'
const ONE_HOUR_IN_SECONDS = 3600
const urlInterceptRegex = [new RegExp(`${self.location.origin}/ip(n|f)s/`)]
let config: ConfigDb

const updateConfig = async (): Promise<void> => {
  config = await getConfig(swLogger)
}
const updateVerifiedFetch = async (): Promise<void> => {
  await updateConfig()

  verifiedFetch = await getVerifiedFetch(config, swLogger)
}
let swIdb: GenericIDB<LocalSwConfig>
let firstInstallTime: number
const getSwConfig = (): GenericIDB<LocalSwConfig> => {
  return swIdb ?? new GenericIDB<LocalSwConfig>('helia-sw-unique', 'config')
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
  // ensure verifiedFetch is ready for use
  event.waitUntil(updateVerifiedFetch())
  /**
   * 👇 Claim all clients immediately. This handles the case when subdomain is
   * loaded for the first time, and config is updated and then a pre-fetch is
   * sent (await fetch(window.location.href, { method: 'GET' })) to start
   * loading the content prior the user reloading or clicking the "load content"
   * button.
   */
  event.waitUntil(self.clients.claim())

  // Delete all caches that aren't named in CURRENT_CACHES.
  const expectedCacheNames = Object.keys(CURRENT_CACHES).map(function (key) {
    return CURRENT_CACHES[key]
  })

  event.waitUntil(
    caches.keys().then(async function (cacheNames) {
      return Promise.all(
        cacheNames.map(async function (cacheName) {
          if (!expectedCacheNames.includes(cacheName)) {
            // If this cache name isn't present in the array of "expected" cache names, then delete it.
            log('deleting out of date cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const urlString = request.url
  const url = new URL(urlString)
  log.trace('incoming request url: %s:', event.request.url)

  event.waitUntil(requestRouting(event, url).then(async (shouldHandle) => {
    if (shouldHandle) {
      log.trace('handling request for %s', url)
      event.respondWith(getResponseFromCacheOrFetch(event))
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
  if (await isTimebombExpired()) {
    log.trace('timebomb expired, deregistering service worker')
    event.waitUntil(deregister(event, false))
    return false
  } else if (isDeregisterRequest(event.request.url)) {
    event.waitUntil(deregister(event))
    return false
  } else if (isConfigPageRequest(url)) {
    log.trace('config page request, ignoring ', event.request.url)
    return false
  } else if (isSwConfigReloadRequest(event)) {
    log.trace('sw-config reload request, updating verifiedFetch')
    event.waitUntil(updateVerifiedFetch().then(() => {
      log.trace('sw-config reload request, verifiedFetch updated')
    }).catch((err) => {
      log.error('sw-config reload request, error updating verifiedFetch', err)
    }))
    return false
  } else if (isAcceptOriginIsolationWarningRequest(event)) {
    event.waitUntil(setOriginIsolationWarningAccepted().then(() => {
      log.trace('origin isolation warning accepted')
    }).catch((err) => {
      log.error('origin isolation warning accepted, error', err)
    }))
    return false
  } else if (isSwConfigGETRequest(event)) {
    log.trace('sw-config GET request')
    event.waitUntil(new Promise<void>((resolve) => {
      event.respondWith(new Response(JSON.stringify(config), {
        headers: {
          'Content-Type': 'application/json'
        }
      }))
      resolve()
    }))
    return false
  } else if (isSwAssetRequest(event)) {
    log.trace('sw-asset request, returning cached response ', event.request.url)
    /**
     * Return the asset from the cache if it exists, otherwise fetch it.
     */
    event.respondWith(caches.open(CURRENT_CACHES.swAssets).then(async (cache) => {
      const cachedResponse = await cache.match(event.request)
      if (cachedResponse != null) {
        return cachedResponse
      }
      const response = await fetch(event.request)
      await cache.put(event.request, response.clone())
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

// potential race condition
async function deregister (event, redirectToConfig = true): Promise<void> {
  if (!isSubdomainRequest(event)) {
    // if we are at the root, we need to ignore this request due to race conditions with the UI
    return
  }
  await self.registration.unregister()
  const clients = await self.clients.matchAll({ type: 'window' })

  for (const client of clients) {
    const newUrl = redirectToConfig ? getRedirectUrl(client.url) : client.url
    try {
      await client.navigate(newUrl)
    } catch (e) {
      log.error('error navigating client to ', newUrl, e)
    }
  }
}

function isRootRequestForContent (event: FetchEvent): boolean {
  const urlIsPreviouslyIntercepted = urlInterceptRegex.some(regex => regex.test(event.request.url))
  const isRootRequest = urlIsPreviouslyIntercepted
  return isRootRequest // && getCidFromUrl(event.request.url) != null
}

function isSubdomainRequest (event: FetchEvent): boolean {
  const { id, protocol } = getSubdomainParts(event.request.url)
  log.trace('isSubdomainRequest.id: ', id)
  log.trace('isSubdomainRequest.protocol: ', protocol)

  return id != null && protocol != null
}

function isConfigPageRequest (url: URL): boolean {
  return isConfigPage(url.hash)
}

function isValidRequestForSW (event: FetchEvent): boolean {
  return isSubdomainRequest(event) || isRootRequestForContent(event)
}

function isAggregateError (err: unknown): err is AggregateError {
  return err instanceof Error && (err as AggregateError).errors != null
}

function isSwConfigReloadRequest (event: FetchEvent): boolean {
  return event.request.url.includes('/#/ipfs-sw-config-reload')
}

function isSwConfigGETRequest (event: FetchEvent): boolean {
  return event.request.url.includes('/#/ipfs-sw-config-get')
}

function isAcceptOriginIsolationWarningRequest (event: FetchEvent): boolean {
  return event.request.url.includes('/#/ipfs-sw-accept-origin-isolation-warning')
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

async function fetchAndUpdateCache (event: FetchEvent, url: URL, cacheKey: string): Promise<Response> {
  const response = await fetchHandler({ path: url.pathname, request: event.request, event })

  // log all of the headers:
  response.headers.forEach((value, key) => {
    log.trace('response headers: %s: %s', key, value)
  })

  log('response status: %s', response.status)

  try {
    await storeReponseInCache({ response, isMutable: true, cacheKey, event })
    log.trace('updated cache for %s', cacheKey)
  } catch (err) {
    log.error('failed updating response in cache for %s', cacheKey, err)
  }

  return response
}

async function getResponseFromCacheOrFetch (event: FetchEvent): Promise<Response> {
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
      void fetchAndUpdateCache(event, url, cacheKey)
    }

    return cachedResponse
  }

  log('cached response MISS for %s', cacheKey)

  return fetchAndUpdateCache(event, url, cacheKey)
}

function shouldCacheResponse ({ event, response }: { event: FetchEvent, response: Response }): boolean {
  if (!response.ok) {
    return false
  }
  const statusCodesToNotCache = [206]
  if (statusCodesToNotCache.some(code => code === response.status)) {
    log('not caching response with status %s', response.status)
    return false
  }
  if (event.request.headers.get('pragma') === 'no-cache' || event.request.headers.get('cache-control') === 'no-cache') {
    log('request indicated no-cache, not caching')
    return false
  }

  return true
}

async function storeReponseInCache ({ response, isMutable, cacheKey, event }: StoreReponseInCacheOptions): Promise<void> {
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
  void cache.put(cacheKey, respToCache)
}

async function fetchHandler ({ path, request, event }: FetchHandlerArg): Promise<Response> {
  const originalUrl = new URL(request.url)
  // test and enforce origin isolation before anything else is executed
  const originLocation = await findOriginIsolationRedirect(originalUrl, swLogger)
  if (originLocation !== null) {
    const body = 'Gateway supports subdomain mode, redirecting to ensure Origin isolation..'
    return new Response(body, {
      status: 301,
      headers: {
        'Content-Type': 'text/plain',
        Location: originLocation
      }
    })
  } else if (!isSubdomainGatewayRequest(originalUrl) && isPathGatewayRequest(originalUrl) && !(await getOriginIsolationWarningAccepted()) && !originalUrl.searchParams.has('helia-sw')) {
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
   * * https://bugs.chromium.org/p/chromium/issues/detail?id=823697
   * * https://bugzilla.mozilla.org/show_bug.cgi?id=1394102
   */
  const abortController = new AbortController()
  const signal = abortController.signal
  const abortFn = (event: Pick<AbortSignalEventMap['abort'], 'type'>): void => {
    clearTimeout(signalAbortTimeout)
    if (event?.type === timeoutAbortEventType) {
      log.trace('timeout waiting for response from @helia/verified-fetch')
      abortController.abort('timeout')
    } else {
      log.trace('request signal aborted')
      abortController.abort('request signal aborted')
    }
  }
  /**
   * five minute delay to get the initial response.
   *
   * @todo reduce to 2 minutes?
   */
  const signalAbortTimeout = setTimeout(() => {
    abortFn({ type: timeoutAbortEventType })
  }, 5 * 60 * 1000)
  // if the fetch event is aborted, we need to abort the signal we give to @helia/verified-fetch
  event.request.signal.addEventListener('abort', abortFn)

  try {
    log('verifiedFetch for ', event.request.url)

    const headers = request.headers
    headers.forEach((value, key) => {
      log.trace('fetchHandler: request headers: %s: %s', key, value)
    })

    const response = await verifiedFetch(event.request.url, {
      signal,
      headers,
      redirect: 'manual',
      onProgress: (e) => {
        log.trace(`${e.type}: `, e.detail)
      }
    })
    /**
     * Now that we've got a response back from Helia, don't abort the promise since any additional networking calls
     * that may performed by Helia would be dropped.
     *
     * If `event.request.signal` is aborted, that would cancel any underlying network requests.
     *
     * Note: we haven't awaited the arrayBuffer, blob, json, etc. `await verifiedFetch` only awaits the construction of
     * the response object, regardless of it's inner content
     */
    clearTimeout(signalAbortTimeout)
    if (response.status >= 400) {
      log.error('fetchHandler: response not ok: ', response)
      return await errorPageResponse(response)
    }
    response.headers.set('ipfs-sw', 'true')
    return response
  } catch (err: unknown) {
    const errorMessages: string[] = []
    if (isAggregateError(err)) {
      log.error('fetchHandler aggregate error: ', err.message)
      for (const e of err.errors) {
        errorMessages.push(e.message)
        log.error('fetchHandler errors: ', e)
      }
    } else {
      errorMessages.push(err instanceof Error ? err.message : JSON.stringify(err))
      log.error('fetchHandler error: ', err)
    }
    const errorMessage = errorMessages.join('\n')

    if (errorMessage.includes('aborted')) {
      return new Response('heliaFetch error aborted due to timeout: ' + errorMessage, { status: 408 })
    }
    return new Response('heliaFetch error: ' + errorMessage, { status: 500 })
  }
}

/**
 * TODO: better styling
 * TODO: more error details from @helia/verified-fetch
 */
async function errorPageResponse (fetchResponse: Response): Promise<Response> {
  const responseContentType = fetchResponse.headers.get('Content-Type')
  let json: Record<string, any> | null = null
  // Clone the response before consuming the body
  const responseCopy = fetchResponse.clone()
  const responseBodyAsText: string | null = await responseCopy.text()

  if (responseContentType != null) {
    if (responseContentType.includes('text/html')) {
      return fetchResponse
    } else if (responseContentType.includes('application/json')) {
      // we may eventually provide error messaging from @helia/verified-fetch
      try {
        json = JSON.parse(responseBodyAsText)
      } catch (e) {
        log.error('error parsing json for error page response', e)
      }
    }
  }
  if (json == null) {
    json = { error: { message: `${fetchResponse.statusText}: ${responseBodyAsText}`, stack: null } }
  } else if (json.error == null) {
    json.error = { message: json.errors.map(e => `<li>${e.message}</li>`).join(''), stack: json.errors.map(e => `<li>${e.stack}</li>`).join('\n') }
  }

  const responseDetails = getResponseDetails(fetchResponse, responseBodyAsText)

  /**
   * TODO: output configuration
   */
  const mergedHeaders = new Headers(fetchResponse.headers)
  mergedHeaders.set('Content-Type', 'text/html')

  return new Response(`<!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error - Service Worker IPFS Gateway</title>
      </head>
      <body>
        <div id="root" class="sans-serif f5">
          <h1>Oops! Something went wrong inside of Service Worker IPFS Gateway.</h1>
          <p>
            <button onclick="window.history.back();">Go back</button>
            <button onclick="window.location.reload(true);">Click here to retry</button>
          </p>
          <p>
            <h2>Error details:</h2>
            <p><b>Message: </b>${json.error.message}</p>
            <b>Stacktrace: </b><pre>${json.error.stack}</pre>
          </p>
          <p>
            <h2>Response details:</h2>
            <h3>${responseDetails.status} ${responseDetails.statusText}</h3>
            <pre>${JSON.stringify(responseDetails, null, 2)}</pre>
          </p>
          <p>
            <h2>Service worker details:</h2>
            <pre>${JSON.stringify(await getServiceWorkerDetails(), null, 2)}</pre>
          </p>
        </div>
      </body>
    </html>`, {
    status: fetchResponse.status,
    statusText: fetchResponse.statusText,
    headers: mergedHeaders
  })
}

/**
 * TODO: more service worker details
 */
async function getServiceWorkerDetails (): Promise<ServiceWorkerDetails> {
  const registration = self.registration
  const state = registration.installing?.state ?? registration.waiting?.state ?? registration.active?.state ?? 'unknown'

  return {
    config: await getConfig(swLogger),
    // TODO: implement https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Opener-Policy
    crossOriginIsolated: self.crossOriginIsolated,
    installTime: (new Date(firstInstallTime)).toUTCString(),
    origin: self.location.origin,
    scope: registration.scope,
    state
  }
}

function getResponseDetails (response: Response, responseBody: string): ResponseDetails {
  const headers = {}
  response.headers.forEach((value, key) => {
    headers[key] = value
  })

  if (response.headers.get('Content-Type')?.includes('application/json')) {
    try {
      responseBody = JSON.parse(responseBody)
    } catch (e) {
      log.error('error parsing json for error page response', e)
    }
  }

  return {
    responseBody,
    headers,
    status: response.status,
    statusText: response.statusText,
    url: response.url
  }
}

async function isTimebombExpired (): Promise<boolean> {
  firstInstallTime = firstInstallTime ?? await getInstallTimestamp()
  const now = Date.now()
  // max life (for now) is 24 hours
  const timebomb = 24 * 60 * 60 * 1000
  return now - firstInstallTime > timebomb
}

async function getInstallTimestamp (): Promise<number> {
  try {
    const swidb = getSwConfig()
    await swidb.open()
    firstInstallTime = await swidb.get('installTimestamp')
    swidb.close()
    return firstInstallTime
  } catch (e) {
    log.error('getInstallTimestamp error: ', e)
    return 0
  }
}

async function addInstallTimestampToConfig (): Promise<void> {
  try {
    const timestamp = Date.now()
    firstInstallTime = timestamp
    const swidb = getSwConfig()
    await swidb.open()
    await swidb.put('installTimestamp', timestamp)
    swidb.close()
  } catch (e) {
    log.error('addInstallTimestampToConfig error: ', e)
  }
}

async function setOriginIsolationWarningAccepted (): Promise<void> {
  try {
    const swidb = getSwConfig()
    await swidb.open()
    await swidb.put('originIsolationWarningAccepted', true)
    swidb.close()
  } catch (e) {
    log.error('addInstallTimestampToConfig error: ', e)
  }
}

async function getOriginIsolationWarningAccepted (): Promise<boolean> {
  try {
    const swidb = getSwConfig()
    await swidb.open()
    const accepted = await swidb.get('originIsolationWarningAccepted')
    swidb.close()
    return accepted ?? false
  } catch (e) {
    log.error('getOriginIsolationWarningAccepted error: ', e)
    return false
  }
}

/**
 * To be called on 'install' sw event. This will clear out the old swAssets cache,
 * which is used for storing the service worker's css,js, and html assets.
 */
async function clearSwAssetCache (): Promise<void> {
  // clear out old swAssets cache
  const cacheName = CURRENT_CACHES.swAssets
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  for (const request of keys) {
    await cache.delete(request)
  }
}
