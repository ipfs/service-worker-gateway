import { AbortError, setMaxListeners } from '@libp2p/interface'
import { CURRENT_CACHES } from '../../constants.js'
import { Config } from '../../lib/config-db.js'
import { QUERY_PARAMS } from '../../lib/constants.js'
import { errorToObject } from '../../lib/error-to-object.js'
import { getSubdomainParts } from '../../lib/get-subdomain-parts.js'
import { getSwLogger } from '../../lib/logger.js'
import { isPathGatewayRequest, isSubdomainGatewayRequest, toSubdomainRequest } from '../../lib/path-or-subdomain.js'
import { isBitswapProvider, isTrustlessGatewayProvider } from '../../lib/providers.js'
import { APP_NAME, APP_VERSION, GIT_REVISION } from '../../version.js'
import { getConfig } from '../lib/config.js'
import { getInstallTime } from '../lib/install-time.js'
import { getVerifiedFetch } from '../lib/verified-fetch.js'
import { fetchErrorPageResponse } from '../pages/fetch-error-page.js'
import { originIsolationWarningPageResponse } from '../pages/origin-isolation-warning-page.js'
import { serverErrorPageResponse } from '../pages/server-error-page.js'
import type { Handler } from './index.js'
import type { UrlParts } from '../../lib/get-subdomain-parts.js'
import type { Providers } from '../index.js'
import type { VerifiedFetchInit } from '@helia/verified-fetch'

interface FetchHandlerArg {
  event: FetchEvent
  logs: string[]
  subdomainGatewayRequest: boolean
  pathGatewayRequest: boolean
  url: URL
  urlParts: UrlParts
  cacheKey: string
  isMutable: boolean
}

const ONE_HOUR_IN_SECONDS = 3600

function getCacheKey (event: FetchEvent): string {
  return `${event.request.url}-${event.request.headers.get('Accept') ?? ''}`
}

async function getResponseFromCacheOrFetch (args: FetchHandlerArg): Promise<Response> {
  const log = getSwLogger('get-response-from-cache-or-fetch')

  log.trace('cache key: %s', args.cacheKey)
  const cache = await caches.open(args.isMutable ? CURRENT_CACHES.mutable : CURRENT_CACHES.immutable)
  const cachedResponse = await cache.match(args.cacheKey)
  const validCacheHit = cachedResponse != null && !hasExpired(cachedResponse)

  if (validCacheHit) {
    log('cached response HIT for %s (expires: %s) %o', args.cacheKey, cachedResponse.headers.get('sw-cache-expires'), cachedResponse)
    return cachedResponse
  }

  log('cached response MISS for %s', args.cacheKey)

  return fetchAndUpdateCache(args)
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
      cache.put(args.cacheKey, respToCache)
        .catch((err) => {
          log.error('error storing response in cache - %e', err)
        })
    )
  } catch (err) {
    log.error('error storing response in cache - %e', err)
  }
}

async function fetchHandler ({ url, event, logs, subdomainGatewayRequest, pathGatewayRequest }: FetchHandlerArg): Promise<Response> {
  const log = getSwLogger('fetch-handler')
  const config = await getConfig()

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
    } catch (err: any) {
      // the user supplied an unparseable/incorrect path or key
      if (err.name === 'InvalidParametersError') {
        return serverErrorPageResponse(url, err, logs, {
          title: '400 Bad Request',
          status: 400
        })
      }

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

  const firstInstallTime = await getInstallTime()
  const verifiedFetch = await getVerifiedFetch()
  const start = Date.now()

  try {
    const response = await verifiedFetch(resource, init)
    response.headers.set('server', `${APP_NAME}/${APP_VERSION}#${GIT_REVISION}`)

    log('%s %s %d %s', init.method ?? 'GET', resource, response.status, response.statusText)

    // Now that we've got a response back from Helia, don't abort the promise
    // since any additional networking calls that may performed by Helia would
    // be dropped.
    //
    // If `event.request.signal` is aborted, that would cancel any underlying
    // network requests.
    //
    // Note: we haven't awaited the arrayBuffer, blob, json, etc.
    // `await verifiedFetch` only awaits the construction of the response
    // object, regardless of it's inner content
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

/**
 * Set a custom expires header on a response object to a timestamp based on the
 * passed ttl interval. Defaults to one hour.
 */
function setExpiresHeader (response: Response, ttlSeconds: number = ONE_HOUR_IN_SECONDS): void {
  const expirationTime = new Date(Date.now() + ttlSeconds * 1000)

  response.headers.set('sw-cache-expires', expirationTime.toUTCString())
}

export const contentRequestHandler: Handler = {
  name: 'content-request-handler',

  canHandle (url) {
    return isSubdomainGatewayRequest(url) || isPathGatewayRequest(url)
  },

  async handle (url, event, logs) {
    // request was for subdomain or path gateway
    const log = getSwLogger('fetch-handler')

    log('handling request for %s', url)

    const urlParts = getSubdomainParts(event.request.url)
    const subdomainGatewayRequest = isSubdomainGatewayRequest(url)
    const pathGatewayRequest = isPathGatewayRequest(url)

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
      cacheKey: getCacheKey(event),
      isMutable: urlParts.protocol === 'ipns'
    })

    return response
  }
}
