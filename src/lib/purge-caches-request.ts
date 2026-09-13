import { QUERY_PARAMS } from './constants.ts'

/**
 * Check if the url includes a `ipfs-sw-purge-caches` parameter
 */
export function isPurgeCachesRequest (url: string): boolean {
  const urlObj = new URL(url)
  const result = urlObj.search.includes(QUERY_PARAMS.PURGE_CACHES)

  return result
}
