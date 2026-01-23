import { QUERY_PARAMS } from '../../lib/constants.ts'
import { updateVerifiedFetch } from '../lib/verified-fetch.ts'
import type { Handler } from './index.ts'

export const configReloadHandler: Handler = {
  name: 'config-reload-handler',

  canHandle (url) {
    return url.searchParams.has(QUERY_PARAMS.RELOAD_CONFIG)
  },

  async handle () {
    await updateVerifiedFetch()

    return new Response('Reloaded configuration', {
      status: 200
    })
  }
}
