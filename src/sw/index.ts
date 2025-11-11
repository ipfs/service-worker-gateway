import { AbortError, setMaxListeners } from '@libp2p/interface'
import { CURRENT_CACHES } from '../constants.js'
import { Config } from '../lib/config-db.js'
import { QUERY_PARAMS } from '../lib/constants.js'
import { errorToObject } from '../lib/error-to-object.js'
import { createSearch } from '../lib/first-hit-helpers.js'
import { GenericIDB } from '../lib/generic-db.js'
import { getSubdomainParts } from '../lib/get-subdomain-parts.js'
import { getVerifiedFetch, logEmitter } from '../lib/get-verified-fetch.js'
import { getSwLogger } from '../lib/logger.js'
import { isPathGatewayRequest, isSubdomainGatewayRequest, toSubdomainRequest } from '../lib/path-or-subdomain.js'
import { isBitswapProvider, isTrustlessGatewayProvider } from '../lib/providers.js'
import { isUnregisterRequest } from '../lib/unregister-request.js'
import { fetchErrorPageResponse } from './pages/fetch-error-page.js'
import { originIsolationWarningPageResponse } from './pages/origin-isolation-warning-page.js'
import { serverErrorPageResponse } from './pages/server-error-page.js'
import type { ConfigDb } from '../lib/config-db.js'
import type { UrlParts } from '../lib/get-subdomain-parts.js'
import type { VerifiedFetch, VerifiedFetchInit } from '@helia/verified-fetch'

/**
 ******************************************************
 * Types
 ******************************************************
 */

interface FetchHandlerArg {
  event: FetchEvent
  logs: string[]
  subdomainGatewayRequest: boolean
  pathGatewayRequest: boolean
  url: URL
  urlParts: UrlParts
  cacheKey: string
  isMutable?: true
}

/**
 * IndexedDB schema for each registered service worker
 *
 * NOTE: this is not intended to be shared between service workers, unlike the
 * default used by config-db.ts
 */
interface LocalSwConfig {
  installTimestamp: number
}

/**
 * These are block/car providers that were used while downloading data
 */
export interface Providers {
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

let verifiedFetch: VerifiedFetch
const ONE_HOUR_IN_SECONDS = 3600
let config: ConfigDb

const updateConfig = async (url?: URL, referrer?: string | null): Promise<void> => {
  const conf = new Config({
    logger: getSwLogger()
  }, {
    url
  })
  await conf.init(referrer ?? undefined)
  config = await conf.get()
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
  console.info(`Service Worker Gateway: To manually unregister, append "?${QUERY_PARAMS.UNREGISTER_SERVICE_WORKER}=true" to the URL, or use the button on the config page.`)

  // delete all caches that aren't named in CURRENT_CACHES.
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

  // collect logs from Helia/libp2p during the fetch operation
  const logs: string[] = []

  function onLog (event: CustomEvent<string>): void {
    logs.push(event.detail)
  }

  logEmitter.addEventListener('log', onLog)

  log.trace('incoming request url: %s:', event.request.url)

  // `event.respondWith` must be called synchronously in the event handler
  // https://stackoverflow.com/questions/76848928/failed-to-execute-respondwith-on-fetchevent-the-event-handler-is-already-f
  event.respondWith(
    handleFetch(url, event, logs)
      .then(response => {
        // uninstall service worker after request has finished
        // TODO: remove this, it breaks offline installations after the TTL
        if (!isServiceWorkerRegistrationTTLValid()) {
          log('Service worker registration TTL expired, unregistering service worker')
          const clonedResponse = response.clone()
          event.waitUntil(
            clonedResponse.blob().then(() => {
              log('Service worker registration TTL expired, unregistering after response consumed')
            }).finally(() => self.registration.unregister())
          )
        }

        if (url.toString().includes('k51qzi5uqu5dk3v4rmjber23h16xnr23bsggmqqil9z2gduiis5se8dht36dam')) {
          response.headers.set('was-mutable', 'maybe')
          /* return new Response('urg', {
            status: 409
          }) */
        }

        return response
      })
      .catch(err => {
        return serverErrorPageResponse(url, err, logs)
      })
      .finally(() => {
        logEmitter.removeEventListener('log', onLog)
      })
  )
})

async function handleFetch (url: URL, event: FetchEvent, logs: string[]): Promise<Response> {
  const log = getSwLogger('handle-fetch')

  // if service worker was shut down, the firstInstallTime may be null
  if (firstInstallTime == null) {
    log('firstInstallTime is null, getting install timestamp')
    await getInstallTimestamp()
  }

  const subdomainGatewayRequest = isSubdomainGatewayRequest(url)
  const pathGatewayRequest = isPathGatewayRequest(url)

  if (isUnregisterRequest(event.request.url)) {
    event.waitUntil(self.registration.unregister())

    return new Response('Service worker unregistered', {
      status: 200
    })
  } else if (isConfigUpdateRequest(url)) {
    // if there is compressed config in the request, apply it
    log('request has inline config, applying it')
    await updateConfig(url, event.request.referrer)

    // remove config param from url and redirect
    const search = createSearch(url.searchParams, {
      filter: (key) => key !== QUERY_PARAMS.CONFIG
    })

    return new Response('Redirecting after config update', {
      status: 307,
      headers: {
        'Content-Type': 'text/plain',
        Location: new URL(`${url.protocol}//${url.host}${url.pathname}${search}${url.hash}`).toString()
      }
    })
  } else if (isSwConfigReloadRequest(event)) {
    log.trace('sw-config reload request, updating verifiedFetch')

    // Wait for the update to complete before sending response

    await updateVerifiedFetch()

    return new Response('Reloaded configuration', {
      status: 200
    })
  } else if (isSwAssetRequest(event)) {
    log.trace('sw-asset request, returning cached response ', event.request.url)

    /**
     * Return the asset from the cache if it exists, otherwise fetch it.
     */
    const cache = await caches.open(CURRENT_CACHES.swAssets)

    try {
      const cachedResponse = await cache.match(event.request)

      if (cachedResponse != null) {
        return cachedResponse
      }
    } catch (err) {
      log.error('error matching cached response - %e', err)
    }

    const response = await fetch(event.request)

    try {
      await cache.put(event.request, response.clone())
    } catch (err) {
      log.error('error caching response - %e', err)
    }

    return response
  } if (subdomainGatewayRequest || pathGatewayRequest) {
    // request was for subdomain or path gateway

    log('handling request for %s', url)

    const urlParts = getSubdomainParts(event.request.url)

    // `bafkqaaa` is an empty identity CID that is used to detect subdomain
    // support so this response MUST be returned before we check for config on
    // this subdomain, otherwise we go into an endless loop of redirects trying
    // to load content
    if (urlParts.id === 'bafkqaaa') {
      return new Response('', {
        status: 200
      })
    }

    const conf = new Config({
      logger: getSwLogger()
    })

    // if we don't have config in the database and we are on a
    // subdomain, we have to redirect to the gateway root to skirt
    // around origin isolation and load any custom config the user has
    // set, then redirect back here
    if ((await conf.hasConfig()) === false && subdomainGatewayRequest) {
      log('subdomain request has no config set, redirecting to gateway root')
      const location = new URL(`${url.protocol}//${urlParts.parentDomain}?${QUERY_PARAMS.REDIRECT}=${encodeURIComponent(event.request.url)}&${QUERY_PARAMS.GET_CONFIG}=true`)

      return new Response('Redirecting for config', {
        status: 307,
        headers: {
          'Content-Type': 'text/plain',
          Location: location.toString()
        }
      })
    }

    // if the service worker has been unloaded, any globals will be null
    if (config == null) {
      await updateConfig()
    }

    // if we need to apply a redirect, apply it now
    const redirect = url.searchParams.get(QUERY_PARAMS.REDIRECT)

    if (redirect != null) {
      return new Response('Redirecting', {
        status: 307,
        headers: {
          'Content-Type': 'text/plain',
          Location: redirect
        }
      })
    }

    const response = await getResponseFromCacheOrFetch({
      event,
      url,
      urlParts,
      subdomainGatewayRequest,
      pathGatewayRequest,
      logs,
      cacheKey: getCacheKey(event)
    })

    return response
  }

  // do not intercept the request
  return fetch(event.request)
}

function isConfigUpdateRequest (url: URL): boolean {
  return url.searchParams.has(QUERY_PARAMS.CONFIG)
}

function isSwConfigReloadRequest (event: FetchEvent): boolean {
  const url = new URL(event.request.url)
  return url.searchParams.get(QUERY_PARAMS.RELOAD_CONFIG) === 'true'
}

function isSwAssetRequest (event: FetchEvent): boolean {
  const isActualSwAsset = /^.+\/(?:ipfs-sw-).+$/.test(event.request.url)

  // if path is not set, then it's a request for index.html which we should
  // consider a sw asset
  const url = new URL(event.request.url)

  // but only if it's not a subdomain request (root index.html should not be
  // returned for subdomains)
  const isIndexHtmlRequest = url.pathname === '/' && !isSubdomainGatewayRequest(url)

  return isActualSwAsset || isIndexHtmlRequest
}

/**
 * Set a custom expires header on a response object to a timestamp based on the
 * passed ttl interval. Defaults to one hour.
 */
function setExpiresHeader (response: Response, ttlSeconds: number = ONE_HOUR_IN_SECONDS): void {
  const expirationTime = new Date(Date.now() + ttlSeconds * 1000)

  response.headers.set('sw-cache-expires', expirationTime.toUTCString())
}

/**
 * Checks whether our custom expires header shows that this response has expired
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

async function fetchAndUpdateCache (args: FetchHandlerArg): Promise<Response> {
  const log = getSwLogger('fetch-and-update-cache')

  const response = await fetchHandler(args)
  log.trace('got response from fetchHandler')

  log('response status: %s', response.status)

  try {
    await storeResponseInCache(response, args)
    log.trace('updated cache for %s', args.cacheKey)
  } catch (err) {
    log.error('failed updating response in cache for %s - %e', args.cacheKey, err)
  }

  return response
}

async function getResponseFromCacheOrFetch (args: FetchHandlerArg): Promise<Response> {
  const log = getSwLogger('get-response-from-cache-or-fetch')

  const isMutable = args.urlParts.protocol === 'ipns'

  log.trace('cache key: %s', args.cacheKey)
  const cache = await caches.open(isMutable ? CURRENT_CACHES.mutable : CURRENT_CACHES.immutable)
  const cachedResponse = await cache.match(args.cacheKey)
  const validCacheHit = cachedResponse != null && !hasExpired(cachedResponse)

  if (validCacheHit) {
    log('cached response HIT for %s (expires: %s) %o', args.cacheKey, cachedResponse.headers.get('sw-cache-expires'), cachedResponse)
    return cachedResponse
  }

  log('cached response MISS for %s', args.cacheKey)

  return fetchAndUpdateCache(args)
}

function shouldCacheResponse (response: Response, args: FetchHandlerArg): boolean {
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

  if (args.event.request.headers.get('pragma') === 'no-cache' || args.event.request.headers.get('cache-control') === 'no-cache') {
    log.trace('request indicated no-cache, not caching')
    return false
  }

  return true
}

async function storeResponseInCache (response: Response, args: FetchHandlerArg): Promise<void> {
  const log = getSwLogger('store-response-in-cache')

  if (!shouldCacheResponse(response, args)) {
    return
  }

  if (args.isMutable) {
    log.trace('setting expires header on response key %s before storing in cache', args.cacheKey)
    // 👇 Set expires header to an hour from now for mutable (ipns://) resources
    // Note that this technically breaks HTTP semantics, whereby the
    // cache-control max-age takes precedence Setting this header is only used
    // by the service worker using a mechanism similar to stale-while-revalidate
    setExpiresHeader(response, ONE_HOUR_IN_SECONDS)
  }

  log.trace('updating cache for %s in the background', args.cacheKey)
  const cache = await caches.open(args.isMutable ? CURRENT_CACHES.mutable : CURRENT_CACHES.immutable)

  // Clone the response since streams can only be consumed once.
  const respToCache = response.clone()

  log('storing response for key %s in cache', args.cacheKey)
  // do not await this.. large responses will delay [TTFB](https://web.dev/articles/ttfb)
  // and [TTI](https://web.dev/articles/tti)

  try {
    // make sure the event lives until async work has completed but do not delay
    // the response
    args.event.waitUntil(
      cache.put(args.cacheKey, respToCache).catch((err) => {
        log.error('error storing response in cache - %e', err)
      })
    )
  } catch (err) {
    log.error('error storing response in cache - %e', err)
  }
}

async function fetchHandler ({ url, event, logs, subdomainGatewayRequest, pathGatewayRequest }: FetchHandlerArg): Promise<Response> {
  const log = getSwLogger('fetch-handler')

  /**
   * > Any global variables you set will be lost if the service worker shuts down.
   *
   * @see https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle
   */
  if (config == null) {
    await updateConfig()
  }

  // test and enforce origin isolation before anything else is executed
  if (!subdomainGatewayRequest && pathGatewayRequest) {
    try {
      const asSubdomainRequest = toSubdomainRequest(url)

      if (config._supportsSubdomains) {
        log.trace('redirecting to subdomain')
        return new Response('Gateway supports subdomain mode, redirecting to ensure Origin isolation..', {
          status: 301,
          headers: {
            'Content-Type': 'text/plain',
            Location: asSubdomainRequest
          }
        })
      }
    } catch {
      // URL was invalid (may have been an IP address which can't be translated
      // to a subdomain gateway URL)
    }

    if (!config.acceptOriginIsolationWarning) {
      log('showing origin isolation warning')
      return originIsolationWarningPageResponse(event.request.url)
    }

    // no subdomain support and the user has yolo'ed the warning so continue to
    // loading the requested content
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
    headers: event.request.headers,
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
      return fetchErrorPageResponse(resource, init, response, await response.text(), providers, config, firstInstallTime, logs)
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
      return fetchErrorPageResponse(resource, init, new Response('', {
        status: 504,
        statusText: 'Gateway Timeout',
        headers: {
          'Content-Type': 'application/json'
        }
      }), JSON.stringify(errorToObject(new AbortError(`Timed out after ${Date.now() - start}ms`)), null, 2), providers, config, firstInstallTime, logs)
    }

    if (event.request.signal.aborted) {
      // the request was cancelled?
    }

    log.error('error during request - %e', err)

    return fetchErrorPageResponse(resource, init, new Response('', {
      status: 500,
      statusText: 'Internal Server Error',
      headers: {
        'Content-Type': 'application/json'
      }
    }), JSON.stringify(errorToObject(err), null, 2), providers, config, firstInstallTime, logs)
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
