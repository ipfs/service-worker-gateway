import { HASH_FRAGMENTS } from './constants.js'
import { hasHashFragment } from './hash-fragments.js'

/**
 * We should load the redirect page if:
 *
 * 1. The request is the first hit on the subdomain
 * - but NOT if subdomains are supported and we're not currently on the subdomain.
 * i.e. example.com#helia-sw=/ipfs/blah will hit shouldRenderRedirectsInterstitial, which will redirect to blah.ipfs.example.com, which will THEN return true from shouldRenderRedirectPage
 * 2. The request is not an explicit request to view the config page
 * 3. The request would otherwise be handled by the service worker but it's not yet registered.
 */
export async function shouldRenderRedirectPage (): Promise<boolean> {
  const { isConfigPage } = await import('../lib/is-config-page.js')
  const { isPathOrSubdomainRequest } = await import('./path-or-subdomain.js')
  const isRequestToViewConfigPage = isConfigPage(window.location.hash)
  const shouldRequestBeHandledByServiceWorker = isPathOrSubdomainRequest(window.location) && !isRequestToViewConfigPage
  const isTopLevelWindow = window.self === window.top
  const isRequestToViewConfigPageAndTopLevelWindow = isRequestToViewConfigPage && isTopLevelWindow
  const result = shouldRequestBeHandledByServiceWorker && !isRequestToViewConfigPageAndTopLevelWindow

  return result
}

export async function shouldRenderConfigPage (): Promise<boolean> {
  const { isConfigPage } = await import('../lib/is-config-page.js')

  const isRequestToViewConfigPage = isConfigPage(window.location.hash)
  return isRequestToViewConfigPage
}

export function shouldRenderRedirectsInterstitial (): boolean {
  // TODO: remove this because I don't think we need it anymore
  return false
}

export function shouldRenderNoServiceWorkerError (): boolean {
  return !('serviceWorker' in navigator)
}

export async function shouldRenderSubdomainWarningPage (): Promise<boolean> {
  const url = new URL(window.location.href)
  if (hasHashFragment(url, HASH_FRAGMENTS.ORIGIN_ISOLATION_WARNING)) {
    return true
  }

  return false
}

export async function shouldRenderFirstHitPage (): Promise<boolean> {
  return window.location.pathname.includes('ipfs-sw-first-hit')
}
