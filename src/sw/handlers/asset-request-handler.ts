import { CURRENT_CACHES } from '../../constants.ts'
import { getSwLogger } from '../../lib/logger.ts'
import type { Handler } from './index.ts'

/**
 * When we are loading a js asset it normally has a hash in the filename. On new
 * deployments these hashes change and the root HTML page is served to try to
 * install the service worker which won't work if it's being loaded from a
 * script tag.
 */
function isCorrectContentType (request: Request, response: Response): boolean {
  const requestUrl = new URL(request.url)

  if (requestUrl.pathname.endsWith('.js') && response.headers.get('content-type')?.includes('javascript') === false) {
    return false
  }

  return true
}

export const assetRequestHandler: Handler = {
  name: 'asset-request-handler',

  canHandle (request, event) {
    const isActualSwAsset = /^.+\/(?:ipfs-sw-).+$/.test(event.request.url)

    // if path is not set, then it's a request for index.html which we should
    // consider a sw asset

    // but only if it's not a subdomain request (root index.html should not be
    // returned for subdomains)
    const isIndexHtmlRequest = request.type === 'internal' && request.url.pathname === '/'

    return isActualSwAsset || isIndexHtmlRequest
  },

  async handle (request, event) {
    const log = getSwLogger('asset-handler')

    // return the asset from the cache if it exists, otherwise fetch it.
    const cache = await caches.open(CURRENT_CACHES.swAssets)

    try {
      const cachedResponse = await cache.match(event.request)

      if (cachedResponse != null) {
        log('returning cached response for', event.request.url)
        return cachedResponse
      }
    } catch (err) {
      log.error('error matching cached response - %e', err)
    }

    const response = await fetch(event.request)

    log('got asset response %d with content type %s for %s', response.status, response.headers.get('content-type'), event.request.url)

    if (response.ok && isCorrectContentType(event.request, response)) {
      event.waitUntil(
        cache.put(event.request, response.clone())
          .catch(err => {
            log.error('error caching response - %e', err)
          })
      )
    }

    return response
  }
}
