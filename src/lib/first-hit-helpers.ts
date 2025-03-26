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
 * This function handles the first hit to the service worker.
 *
 * It ensures that any query and hash params are preserved and returns the new URL with helia-sw parameter set correctly.
 */
export const getHeliaSwRedirectUrl = (currentUrl: string): URL => {
  const url = new URL(currentUrl)
  if (url.searchParams.has('helia-sw')) {
    // eslint-disable-next-line no-console
    console.log('helia-sw already exists, returning current url')
    return url
  } else {
    // eslint-disable-next-line no-console
    console.trace('helia-sw does not exist in %s, creating new url', currentUrl)
  }
  const redirectUrl = new URL('', url.origin)

  // ensure any query and hash params are preserved
  const heliaSwPath = `${url.pathname}${url.search}${url.hash}`

  // eslint-disable-next-line no-console
  console.log('heliaSwPath', heliaSwPath)
  redirectUrl.searchParams.set('helia-sw', heliaSwPath)

  // remove the current url from the history
  // history.replaceState({}, '', redirectUrl.toString())

  return redirectUrl
}
