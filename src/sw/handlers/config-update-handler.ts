import { QUERY_PARAMS } from '../../lib/constants.js'
import { createSearch } from '../../lib/first-hit-helpers.js'
import { updateConfig } from '../lib/config.js'
import type { Handler } from './index.js'

export const configUpdateHandler: Handler = {
  name: 'config-update-handler',

  canHandle (url, event) {
    return url.searchParams.has(QUERY_PARAMS.CONFIG)
  },

  async handle (url: URL, event: FetchEvent) {
    // if there is compressed config in the request, apply it
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
  }
}
