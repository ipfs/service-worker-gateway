import { trace } from './logger.ts'

// things are wonky with hash routes for deregistering.
export function isDeregisterRequest (url: string): boolean {
  const urlObj = new URL(url)
  const result = urlObj.search.includes('ipfs-sw-deregister')
  trace('isDeregisterRequest: ', url, result)
  return result
}

export function getRedirectUrl (url: string): URL {
  const redirectUrl = new URL(url)
  redirectUrl.search = ''
  redirectUrl.hash = '#/ipfs-sw-config'
  return redirectUrl
}
