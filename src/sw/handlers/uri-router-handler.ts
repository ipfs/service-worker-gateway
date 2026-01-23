import { QUERY_PARAMS } from '../../lib/constants.ts'
import { getSwLogger } from '../../lib/logger.ts'
import type { Handler } from './index.ts'

export const uriRouterHandler: Handler = {
  name: 'uri-router-handler',

  canHandle (url) {
    return (url.pathname === '/ipfs/' || url.pathname === '/ipns/') && url.searchParams.has(QUERY_PARAMS.URI_ROUTER)
  },

  async handle (url: URL, event: FetchEvent) {
    const log = getSwLogger('uri-router')

    const uri = new URL(url.searchParams.get(QUERY_PARAMS.URI_ROUTER) ?? '')

    if (uri.protocol === 'ipfs:' || uri.protocol === 'ipns:') {
      const location = `/${uri.protocol.substring(0, 4)}/${uri.hostname}${uri.pathname}${uri.search}${uri.hash}`
      log('redirecting %s to %s', uri, location)

      return new Response('', {
        status: 301,
        headers: {
          location
        }
      })
    }

    log('could not redirect %s', uri)
    return new Response('', {
      status: 400
    })
  }
}
