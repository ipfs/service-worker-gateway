import { CURRENT_CACHES } from '../../constants.js'
import { getSwLogger } from '../../lib/logger.js'
import { isSubdomainGatewayRequest } from '../../lib/path-or-subdomain.js'
import type { Handler } from './index.js'

export const assetRequestHandler: Handler = {
  name: 'asset-request-handler',

  canHandle (url, event) {
    const isActualSwAsset = /^.+\/(?:ipfs-sw-).+$/.test(event.request.url)

    // if path is not set, then it's a request for index.html which we should
    // consider a sw asset

    // but only if it's not a subdomain request (root index.html should not be
    // returned for subdomains)
    const isIndexHtmlRequest = url.pathname === '/' && !isSubdomainGatewayRequest(url)

    return isActualSwAsset || isIndexHtmlRequest
  },

  async handle (url: URL, event: FetchEvent) {
    const log = getSwLogger('asset-handler')

    // return the asset from the cache if it exists, otherwise fetch it.
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
  }
}
