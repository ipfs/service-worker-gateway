/**
 * Check if the url includes a `ipfs-sw-unregister` parameter
 */
export function isUnregisterRequest (url: string): boolean {
  const urlObj = new URL(url)
  const result = urlObj.search.includes('ipfs-sw-unregister')

  return result
}
