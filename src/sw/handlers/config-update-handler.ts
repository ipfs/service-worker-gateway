import { QUERY_PARAMS } from '../../lib/constants.ts'
import { createSearch } from '../../lib/query-helpers.ts'
import { updateConfig } from '../lib/config.ts'
import type { Handler } from './index.ts'

export const configUpdateHandler: Handler = {
  name: 'config-update-handler',

  canHandle (url) {
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
