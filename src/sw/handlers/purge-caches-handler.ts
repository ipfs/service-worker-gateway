import { getSwLogger } from '../../lib/logger.ts'
import { isPurgeCachesRequest } from '../../lib/purge-caches-request.ts'
import type { Handler } from './index.ts'

/**
 * Purge all Cache API storage created by the service worker.
 *
 * Cache storage persists across service worker deregistrations, so this is
 * the only way to reclaim that space short of clearing site data. After
 * purging, visiting any page will re-install the service worker.
 *
 * Triggered by the `?ipfs-sw-purge-caches=true` query param, mirroring the
 * `?ipfs-sw-unregister=true` precedent.
 *
 * @see https://github.com/ipfs/service-worker-gateway/issues/507
 */
export const purgeCachesHandler: Handler = {
  name: 'purge-caches-handler',

  canHandle (url, event) {
    return isPurgeCachesRequest(event.request.url)
  },

  async handle (url, event) {
    const log = getSwLogger('purge-caches-handler')

    let purged = 0
    try {
      const keys = await caches.keys()
      await Promise.all(
        keys.map(async (key) => {
          try {
            const deleted = await caches.delete(key)
            if (deleted) {
              purged++
              log('purged cache %s', key)
            }
          } catch (err) {
            log.error('could not delete cache %s - %e', key, err)
          }
        })
      )
    } catch (err) {
      log.error('could not enumerate caches - %e', err)
      return new Response(`Failed to purge caches: ${err instanceof Error ? err.message : String(err)}`, {
        status: 500
      })
    }

    log('purged %d cache(s)', purged)
    return new Response(`Purged ${purged} cache(s)`, {
      status: 200
    })
  }
}
