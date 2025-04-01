import { checkSubdomainSupport } from './check-subdomain-support.js'
import { areSubdomainsSupported } from './config-db.js'
import { uiLogger } from './logger.js'
import { findOriginIsolationRedirect, isPathGatewayRequest, isSubdomainGatewayRequest } from './path-or-subdomain.js'

const log = uiLogger.forComponent('first-hit-helpers')

/**
 * This function ensures that we are on the correct path before registering the service worker.
 *
 * If we are on a subdomain with a path, we redirect to the subdomain root with a ?helia-sw= parameter.
 * If we are on a path gateway request, we check if subdomains are supported and redirect to the subdomain root with a ?helia-sw= parameter.
 */
export async function ensureSwScope (): Promise<void> {
  // Handle first-hit requests to a subdomain with a path
  if (isSubdomainGatewayRequest(window.location) && window.location.pathname !== '/') {
    log.trace('first-hit on subdomain with path, redirecting to subdomain root')
    // For first-hit on subdomain with path, redirect to the subdomain root with a ?helia-sw= parameter
    const url = new URL(window.location.href)
    const originalPath = url.pathname
    url.pathname = '/'
    url.searchParams.set('helia-sw', originalPath)
    window.location.replace(url.toString())
    return
  }

  // Check if we're on a path gateway request and if subdomains are supported before registration
  // This avoids waiting for the service worker to register and then redirecting anyway.
  if (isPathGatewayRequest(window.location)) {
  // Check if subdomains are supported
    await checkSubdomainSupport()
    const supportsSubdomains = await areSubdomainsSupported(uiLogger)

    if (supportsSubdomains === true) {
      log.trace('subdomain support is enabled, redirecting before service worker registration')
      const redirect = await findOriginIsolationRedirect(window.location, uiLogger)
      if (redirect !== null) {
        window.location.replace(redirect)
      }
    } else {
      log.trace('subdomain support is disabled, but we still need to redirect to the root path to register the service worker')
      const url = new URL(window.location.href)
      url.pathname = '/'
      url.searchParams.set('helia-sw', window.location.pathname)
      window.location.replace(url.toString())
    }
  }
}

/**
 * This function handles the first hit to the service worker when the first hit
 * is to /ipfs or /ipns and ipfs-sw-first-hit.html is loaded.
 *
 * It redirects to the subdomain root with a ?helia-sw= parameter.
 */
export const handleFirstHit = ({ location, history }: { location: Pick<Location, 'href' | 'origin'>, history: Pick<History, 'replaceState'> }): void => {
  const url = new URL(location.href)
  const path = url.pathname
  const query = url.searchParams
  const redirectUrl = new URL('/', location.origin)

  // we need to redirect to ?helia-sw=<path> and preserve any query parameters
  redirectUrl.searchParams.set('helia-sw', path)
  query.forEach((value, key) => {
    redirectUrl.searchParams.set(key, value)
  })

  const newUrl = redirectUrl.toString()

  // remove the current url from the history
  history.replaceState({}, '', newUrl)

  // we need to redirect to the new url
  location.href = newUrl
}
