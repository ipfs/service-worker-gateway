import { MEDIA_TYPE_CAR, MEDIA_TYPE_CBOR, MEDIA_TYPE_DAG_CBOR, MEDIA_TYPE_DAG_JSON, MEDIA_TYPE_DAG_PB, MEDIA_TYPE_IPNS_RECORD, MEDIA_TYPE_JSON, MEDIA_TYPE_RAW, MEDIA_TYPE_TAR } from '@helia/verified-fetch'
import { AbortError, setMaxListeners, TimeoutError } from '@libp2p/interface'
import { anySignal } from 'any-signal'
import { config } from '../../config/index.ts'
import { CURRENT_CACHES } from '../../constants.ts'
import { errorToObject } from '../../lib/error-to-object.ts'
import { getSubdomainParts } from '../../lib/get-subdomain-parts.ts'
import { getSwLogger } from '../../lib/logger.ts'
import { isBitswapProvider, isTrustlessGatewayProvider } from '../../lib/providers.ts'
import { createSearch } from '../../lib/query-helpers.ts'
import { APP_NAME, APP_VERSION, GIT_REVISION } from '../../version.ts'
import { getInstallTime } from '../lib/install-time.ts'
import { getVerifiedFetch } from '../lib/verified-fetch.ts'
import { fetchErrorPageResponse } from '../pages/fetch-error-page.ts'
import { renderEntityPageResponse } from '../pages/render-entity.ts'
import type { Handler } from './index.ts'
import type { ContentURI } from '../../lib/parse-request.ts'
import type { Providers } from '../index.ts'
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
  request: ContentURI
  headers: Headers
  renderHtml: boolean
  cacheKey: string
  isMutable: boolean
  accept: string | null
}

const ONE_HOUR_IN_SECONDS = 3600

function getCacheKey (resource: ContentURI, headers: Headers, renderHtml: boolean): string {
  return `${resource.subdomainURL}-${headers.get('accept')}-html-${renderHtml}-match-${headers.get('if-none-match')}`
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

async function fetchHandler ({ request, headers, renderHtml, event, logs, accept }: FetchHandlerArg): Promise<Response> {
  const log = getSwLogger('fetch-handler')

  const providers: Providers = {
    total: 0,
    providers: []
  }

  const resource = request.nativeURL
  const firstInstallTime = await getInstallTime()
  const start = Date.now()

  let ifNoneMatch = headers.get('if-none-match')

  // these tokens are added to the header by the entity renderer response,
  // remove them for internal comparison by verified fetch
  if (ifNoneMatch != null) {
    ifNoneMatch = ifNoneMatch.replace('DirIndex-.*_CID-', '')
    ifNoneMatch = ifNoneMatch.replace('DagIndex-', '')

    headers.set('if-none-match', ifNoneMatch)
  }

  // make the timeout apply to receiving the response headers, then to each
  // chunk of the body
  const abortController = new AbortController()
  let timeout = setTimeout(() => {
    abortController.abort(new TimeoutError('Timed out'))
  }, config.fetchTimeout)

  /**
   * Note that there are existing bugs regarding service worker signal handling:
   * https://bugs.chromium.org/p/chromium/issues/detail?id=823697
   * https://bugzilla.mozilla.org/show_bug.cgi?id=1394102
   */
  const signal = anySignal([
    event.request.signal,
    abortController.signal
  ])
  setMaxListeners(Infinity, signal)

  const init: VerifiedFetchInit = {
    signal,
    headers,
    redirect: 'manual',
    onProgress: (evt) => {
      if (evt.type.endsWith(':found-provider')) {
        providers.total++

        log('got found-provider event %s %j %e', evt.type, evt.detail, new Error('where'))

        if (isBitswapProvider(evt.detail)) {
          providers.providers.push({
            type: evt.detail.type,
            routing: evt.detail.routing,
            provider: evt.detail.provider
          })
        } else if (isTrustlessGatewayProvider(evt.detail)) {
          providers.providers.push({
            type: evt.detail.type,
            routing: evt.detail.routing,
            provider: evt.detail.url
          })
        } else {
          providers.providers.push({
            type: 'unknown',
            // @ts-expect-error cannot derive type
            routing: evt.detail?.routing ?? 'unknown',
            provider: evt.detail
          })
        }

        providers.total++

        // truncate providers if there are too many
        if (providers.providers.length > 10) {
          providers.providers.length = 10
        }
      }
    },
    supportDirectoryIndexes: resource.searchParams.get('download') !== 'false',
    supportWebRedirects: resource.searchParams.get('download') !== 'false'
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

    // now that the root block has been fetched and the blockstore session
    // created, if a gateway hint was present we need to redirect the user to
    // a bare URL that removes the hint. this makes it harder (though not
    // impossible) for users to share URLs with baked-in routing information
    // that may become stale over time
    if (response.ok && request.subdomainURL.searchParams.has('gateway')) {
      const search = createSearch(request.subdomainURL.searchParams, {
        filter: (key) => key !== 'gateway'
      })

      const location = `${request.subdomainURL.protocol}//${request.subdomainURL.host}${request.subdomainURL.pathname}${search}${request.subdomainURL.hash}`

      return new Response('', {
        status: 302,
        headers: {
          location
        }
      })
    }

    log('response')
    log('HTTP/1.1 %d %s', response.status, response.statusText)

    for (const [key, value] of response.headers.entries()) {
      log('%s: %s', key, value)
    }

    // render previews for UnixFS directories
    if (response.headers.get('content-type') === MEDIA_TYPE_DAG_PB) {
      renderHtml = shouldRenderDirectory(resource, accept)
    }

    if (response.status > 399) {
      return fetchErrorPageResponse(request, init, response, await response.text(), providers, firstInstallTime, logs)
    }

    if (response.status > 199 && response.status < 300) {
      if (renderHtml) {
        try {
          return renderEntityPageResponse(request, headers, response, await response.arrayBuffer())
        } catch (err: any) {
          log.error('error while loading body to render - %e', err)

          // if the response content involves loading more than one block and
          // loading a subsequent block fails, the `.arrayBuffer()` promise will
          // reject with an opaque 'TypeError: Failed to fetch' so show a 502
          // Bad Gateway with debugging information
          return fetchErrorPageResponse(request, init, new Response('', {
            status: 502,
            statusText: 'Bad Gateway',
            headers: {
              'Content-Type': 'application/json'
            }
          }), JSON.stringify(errorToObject(err), null, 2), providers, firstInstallTime, logs)
        }
      } else if (resource.searchParams.get('download') === 'true') {
        // override inline attachments if present
        let contentDisposition = response.headers.get('content-disposition')

        if (contentDisposition == null || contentDisposition === '') {
          contentDisposition = 'attachment'
        } else if (contentDisposition.startsWith('inline')) {
          contentDisposition = contentDisposition.replace('inline', 'attachment')
        }

        response.headers.set('content-disposition', contentDisposition)
      }
    }

    // this passthrough body stream resets the inactivity timer on every chunk
    const body = response.body?.pipeThrough(new TransformStream({
      transform (chunk, controller) {
        clearTimeout(timeout)
        timeout = setTimeout(() => {
          abortController.abort(new TimeoutError('Timed out'))
        }, config.fetchTimeout)

        controller.enqueue(chunk)
      },
      flush () {
        clearTimeout(timeout)
      }
    }))

    // Create a completely new response object with the same body, status,
    // statusText, and headers.
    //
    // This is necessary to work around a bug with Safari not rendering
    // content correctly.
    return new Response(body, {
      status: response.status,
      headers: response.headers,
      statusText: response.statusText
    })
  } catch (err: any) {
    if (abortController.signal.aborted) {
      return fetchErrorPageResponse(request, init, new Response('', {
        status: 504,
        statusText: 'Gateway Timeout',
        headers: {
          'content-type': 'application/json'
        }
      }), JSON.stringify(errorToObject(new AbortError(`Timed out after ${Date.now() - start}ms`)), null, 2), providers, firstInstallTime, logs)
    }

    abortController.abort(new Error('Nope'))

    log.error('error during request - %e', err)

    return fetchErrorPageResponse(request, init, new Response('', {
      status: 500,
      statusText: 'Internal Server Error',
      headers: {
        'content-type': 'application/json',
        'x-error-message': btoa(err.message)
      }
    }), JSON.stringify(errorToObject(err), null, 2), providers, firstInstallTime, logs)
  } finally {
    signal.clear()
    clearTimeout(timeout)
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

function shouldRenderDirectory (url: URL, accept?: string | null): boolean {
  if (url.searchParams.get('download') === 'true') {
    return false
  } else if (url.searchParams.get('download') === 'false') {
    return true
  }

  return accept?.includes('text/html') === true
}

export const contentRequestHandler: Handler = {
  name: 'content-request-handler',

  canHandle (request) {
    return request.type === 'subdomain'
  },

  async handle (request: ContentURI, event, logs) {
    // request was for subdomain or path gateway
    const log = getSwLogger('fetch-handler')

    log('handling request for %s', request.subdomainURL)

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

    const headers = createHeaders(event)
    let renderHtml = false

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
        renderHtml = true
      }
    }

    // if the user has explicitly requested a preview, show it to them
    if (request.subdomainURL.searchParams.get('download') === 'false') {
      renderHtml = true
    }

    const response = await getResponseFromCacheOrFetch({
      event,
      request,
      headers,
      logs,
      cacheKey: getCacheKey(request, headers, renderHtml),
      isMutable: urlParts.protocol === 'ipns',
      renderHtml,
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
