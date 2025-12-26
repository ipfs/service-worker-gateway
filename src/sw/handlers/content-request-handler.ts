import { MEDIA_TYPE_CAR, MEDIA_TYPE_CBOR, MEDIA_TYPE_DAG_CBOR, MEDIA_TYPE_DAG_JSON, MEDIA_TYPE_DAG_PB, MEDIA_TYPE_IPNS_RECORD, MEDIA_TYPE_JSON, MEDIA_TYPE_RAW, MEDIA_TYPE_TAR } from '@helia/verified-fetch'
import { AbortError, setMaxListeners } from '@libp2p/interface'
import { anySignal } from 'any-signal'
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
import { renderEntityPageResponse } from '../pages/render-entity.js'
import { serverErrorPageResponse } from '../pages/server-error-page.js'
import type { Handler } from './index.js'
import type { ConfigDb } from '../../lib/config-db.js'
import type { Providers } from '../index.js'
import type { VerifiedFetchInit } from '@helia/verified-fetch'

const FORMAT_TO_MEDIA_TYPE: Record<string, string> = {
  raw: 'application/vnd.ipld.raw',
  car: 'application/vnd.ipld.car',
  tar: 'application/x-tar',
  'dag-json': 'application/vnd.ipld.dag-json',
  'dag-cbor': 'application/vnd.ipld.dag-cbor',
  json: 'application/json',
  cbor: 'application/cbor',
  'ipns-record': 'application/vnd.ipfs.ipns-record'
}

interface FetchHandlerArg {
  event: FetchEvent
  logs: string[]
  subdomainGatewayRequest: boolean
  pathGatewayRequest: boolean
  url: URL
  headers: Headers
  renderPreview: boolean
  cacheKey: string
  isMutable: boolean
  accept: string | null
}

const ONE_HOUR_IN_SECONDS = 3600

function getCacheKey (url: URL, headers: Headers, renderPreview: boolean, config: ConfigDb): string {
  return `${url}-${headers.get('accept') ?? ''}-preview-${renderPreview}-indexes-${config.supportDirectoryIndexes}-redirects-${config.supportWebRedirects}`
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
    log.trace('response not ok, not caching %s %d %s', response.url, response.status, response.statusText)

    for (const [key, value] of response.headers) {
      log.trace('%s: %s', key, value)
    }

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

async function fetchHandler ({ url, headers, renderPreview, event, logs, subdomainGatewayRequest, pathGatewayRequest, accept }: FetchHandlerArg): Promise<Response> {
  const log = getSwLogger('fetch-handler')
  const config = await getConfig()

  // test and enforce origin isolation before anything else is executed
  if (!subdomainGatewayRequest && pathGatewayRequest) {
    try {
      const asSubdomainRequest = toSubdomainRequest(url)

      if (config._supportsSubdomains) {
        log.trace('url was %s', url.toString())
        log.trace('redirecting to subdomain - %s', asSubdomainRequest)

        return new Response('Gateway supports subdomain mode, redirecting to ensure Origin isolation..', {
          status: 301,
          headers: {
            'Content-Type': 'text/plain',
            Location: asSubdomainRequest.toString()
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

  const providers: Providers = {
    total: 0,
    bitswap: new Map(),
    trustlessGateway: new Set(),
    other: [],
    otherCount: 0
  }

  const resource = url.href

  const firstInstallTime = await getInstallTime()
  const start = Date.now()

  /**
   * Note that there are existing bugs regarding service worker signal handling:
   * https://bugs.chromium.org/p/chromium/issues/detail?id=823697
   * https://bugzilla.mozilla.org/show_bug.cgi?id=1394102
   */
  const timeoutSignal = AbortSignal.timeout(config.fetchTimeout)
  const signal = anySignal([
    event.request.signal,
    timeoutSignal
  ])
  setMaxListeners(Infinity, signal)

  const init: VerifiedFetchInit = {
    signal,
    headers,
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
    },
    supportDirectoryIndexes: config.supportDirectoryIndexes,
    supportWebRedirects: config.supportWebRedirects
  }

  try {
    const verifiedFetch = await getVerifiedFetch()

    log('request')
    log('%s %s HTTP/1.1', init.method ?? 'GET', resource)

    for (const [key, value] of headers.entries()) {
      log('%s: %s', key, value)
    }

    const response = await verifiedFetch(resource, init)
    response.headers.set('server', `${APP_NAME}/${APP_VERSION}#${GIT_REVISION}`)

    log('response')
    log('HTTP/1.1 %d %s', response.status, response.statusText)

    for (const [key, value] of response.headers.entries()) {
      log('%s: %s', key, value)
    }

    // render previews for UnixFS directories
    if (response.headers.get('content-type') === MEDIA_TYPE_DAG_PB) {
      renderPreview = shouldRenderDirectory(url, config, accept)
    }

    if (!response.ok) {
      return fetchErrorPageResponse(resource, init, response, await response.text(), providers, config, firstInstallTime, logs)
    }

    if (renderPreview) {
      try {
        return renderEntityPageResponse(url, headers, response, await response.arrayBuffer())
      } catch (err: any) {
        log.error('error while loading body to render - %e', err)

        // if the response content involves loading more than one block and
        // loading a subsequent block fails, the `.arrayBuffer()` promise will
        // reject with an opaque 'TypeError: Failed to fetch' so show a 502 Bad
        // Gateway with debugging information
        return fetchErrorPageResponse(resource, init, new Response('', {
          status: 502,
          statusText: 'Bad Gateway',
          headers: {
            'Content-Type': 'application/json'
          }
        }), JSON.stringify(errorToObject(err), null, 2), providers, config, firstInstallTime, logs)
      }
    }

    if (url.searchParams.get('download') === 'true') {
      // override inline attachments if present
      let contentDisposition = response.headers.get('content-disposition')

      if (contentDisposition == null || contentDisposition === '') {
        contentDisposition = 'attachment'
      } else if (contentDisposition.startsWith('inline')) {
        contentDisposition = contentDisposition.replace('inline', 'attachment')
      }

      response.headers.set('content-disposition', contentDisposition)
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
          'content-type': 'application/json'
        }
      }), JSON.stringify(errorToObject(new AbortError(`Timed out after ${Date.now() - start}ms`)), null, 2), providers, config, firstInstallTime, logs)
    }

    log.error('error during request - %e', err)

    return fetchErrorPageResponse(resource, init, new Response('', {
      status: 500,
      statusText: 'Internal Server Error',
      headers: {
        'content-type': 'application/json'
      }
    }), JSON.stringify(errorToObject(err), null, 2), providers, config, firstInstallTime, logs)
  } finally {
    signal.clear()
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

function shouldRenderDirectory (url: URL, config: ConfigDb, accept?: string | null): boolean {
  if (url.searchParams.get('download') === 'true') {
    return false
  } else if (url.searchParams.get('download') === 'false') {
    return true
  }

  if (config.renderHTMLViews === false) {
    return false
  }

  return accept?.includes('text/html') === true
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

      return new Response('', {
        status: 307,
        headers: {
          location: location.toString()
        }
      })
    }

    // if we need to apply a redirect, apply it now
    const redirect = url.searchParams.get(QUERY_PARAMS.REDIRECT)

    if (redirect != null) {
      return new Response('', {
        status: 307,
        headers: {
          location: redirect
        }
      })
    }

    const config = await conf.get()
    const headers = createHeaders(event)
    let renderPreview = false

    const accept = headers.get('accept')

    if (accept != null) {
      if (acceptsIPLD(accept)) {
        // honour an Accept header that verified-fetch supports - this will not
        // 406
      } else if (acceptsAnything(accept)) {
        // this is a workaround for the fact that browsers always send an accept
        // header that includes text/html so we'd never send file content
        headers.delete('accept')
      } else if (acceptsHTML(accept)) {
        // verified-fetch will 406 but we can render an HTML view of the result so
        // remove the accept header and accept whatever verified-fetch gives us
        headers.delete('accept')

        if (url.searchParams.get('download') !== 'true') {
          renderPreview = true
        }
      }
    }

    const response = await getResponseFromCacheOrFetch({
      event,
      url,
      headers,
      subdomainGatewayRequest,
      pathGatewayRequest,
      logs,
      cacheKey: getCacheKey(url, headers, renderPreview, config),
      isMutable: urlParts.protocol === 'ipns',
      renderPreview,
      accept
    })

    return response
  }
}

function createHeaders (event: FetchEvent): Headers {
  const headers = new Headers(event.request.headers)
  const url = new URL(event.request.url)

  // override the Accept header if the format param is present
  // https://specs.ipfs.tech/http-gateways/path-gateway/#format-request-query-parameter
  const format = url.searchParams.get('format')
  if (isCarRequest(url)) {
    const accept = `application/vnd.ipld.car; version=${
      url.searchParams.get('car-version') ?? '1'
    }; order=${
      url.searchParams.get('car-order') ?? 'unk'
    }; dups=${
      url.searchParams.get('car-dups') ?? 'y'
    }`

    headers.set('accept', accept)
  } else if (format != null) {
    const accept = FORMAT_TO_MEDIA_TYPE[format]

    if (accept != null) {
      headers.set('accept', accept)
    }
  }

  // if the user has specified CAR options but no Accept header, default to
  // the car content type with the passed options
  return headers
}

/**
 * Returns `true` if the user has requested a specific IPLD format
 */
function acceptsIPLD (accept: string): boolean {
  return [
    MEDIA_TYPE_DAG_CBOR,
    MEDIA_TYPE_CBOR,
    MEDIA_TYPE_DAG_JSON,
    MEDIA_TYPE_JSON,
    MEDIA_TYPE_RAW,
    MEDIA_TYPE_IPNS_RECORD,
    MEDIA_TYPE_DAG_PB,
    MEDIA_TYPE_CAR,
    MEDIA_TYPE_TAR
  ].some(val => accept.includes(val))
}

/**
 * Returns `true` if the user accepts HTML
 */
function acceptsHTML (accept: string): boolean {
  return [
    'text/html'
  ].some(val => accept.includes(val))
}

/**
 * Returns `true` if the user accepts HTML
 */
function acceptsAnything (accept: string): boolean {
  return [
    '*/*'
  ].some(val => accept.includes(val))
}

/**
 * Returns `true` if the user requested a CAR file via search params
 */
function isCarRequest (url: URL): boolean {
  return url.searchParams.get('format') === 'car' ||
    url.searchParams.has('entity-bytes') ||
    url.searchParams.has('dag-scope') ||
    url.searchParams.has('car-order') ||
    url.searchParams.has('car-dups') ||
    url.searchParams.has('car-version')
}
