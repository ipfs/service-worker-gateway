import { QUERY_PARAMS } from './constants.ts'

/**
 * Check if the url includes a `ipfs-sw-unregister` parameter
 */
export function isUnregisterRequest (url: string): boolean {
  const urlObj = new URL(url)
  const result = urlObj.search.includes(QUERY_PARAMS.UNREGISTER_SERVICE_WORKER)

  return result
}
