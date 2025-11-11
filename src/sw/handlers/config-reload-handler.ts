import { QUERY_PARAMS } from '../../lib/constants.js'
import { updateVerifiedFetch } from '../lib/verified-fetch.js'
import type { Handler } from './index.js'

export const configReloadHandler: Handler = {
  name: 'config-reload-handler',

  canHandle (url, event) {
    return url.searchParams.has(QUERY_PARAMS.RELOAD_CONFIG)
  },

  async handle () {
    await updateVerifiedFetch()

    return new Response('Reloaded configuration', {
      status: 200
    })
  }
}
