import { checkSubdomainSupport } from './check-subdomain-support.js'
import { areSubdomainsSupported } from './config-db.js'
import { uiLogger } from './logger.js'
import { findOriginIsolationRedirect, isPathGatewayRequest, isSubdomainGatewayRequest } from './path-or-subdomain.js'
import { QUERY_PARAMS } from './constants.js'

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
    url.searchParams.set(QUERY_PARAMS.HELIA_SW, originalPath)
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
      url.searchParams.set(QUERY_PARAMS.HELIA_SW, window.location.pathname)
      window.location.replace(url.toString())
    }
  }
}

/**
 * This function creates a URL with the ?helia-sw= parameter set to redirect to the desired path.
 * It preserves query parameters and hash from the provided URL.
 *
 * When a targetURL is provided, it uses that as a template and preserves its structure,
 * only adding the helia-sw parameter if the originalURL has a non-root path.
 *
 * @param originalURL - The original URL with origin/path/query/hash
 * @param targetURL - Optional URL to use as a template for the redirect (defaults to '/' at originalURL.origin)
 * @returns A new URL object with the helia-sw parameter and other preserved information
 */
export function getHeliaSwRedirectUrl (
  originalURL: URL,
  targetURL?: URL | null
): URL {
  // Determine the path to use for the helia-sw parameter
  let path = originalURL.pathname

  // Decode the path to avoid double encoding
  try {
    path = decodeURIComponent(path)
  } catch {
    // If decoding fails, leave the path as is.
  }

  const query = originalURL.searchParams
  const hash = originalURL.hash

  // Use the provided targetURL as a template or create a new one at the root of the original origin
  const redirectUrl = targetURL ?? new URL('/', originalURL.origin)

  // Set helia-sw parameter to the path, if it's meaningful
  if (path != null && path !== '/') {
    redirectUrl.searchParams.set(QUERY_PARAMS.HELIA_SW, path)
  }

  // Preserve existing query parameters from pathURL
  query.forEach((value, key) => {
    if (key !== QUERY_PARAMS.HELIA_SW && !(targetURL !== null && targetURL !== undefined && redirectUrl.searchParams.has(key))) {
      redirectUrl.searchParams.set(key, value)
    }
  })

  // Preserve hash
  if (hash != null && hash !== '') {
    redirectUrl.hash = hash
  }

  return redirectUrl
}

/**
 * Converts a URL request for <rootDomain>?helia-sw=<protocol/id/path> to a URL request for <id>.<protocol>.<rootDomain>/<path>
 *
 * TODO: handle conversions to cidv1
 */
export function getIsolatedOriginRedirectUrl (url: URL): URL {
  const heliaSw = url.searchParams.get(QUERY_PARAMS.HELIA_SW)
  if (heliaSw != null) {
    url.searchParams.delete(QUERY_PARAMS.HELIA_SW)
    const [_, protocol, id, ...path] = heliaSw.split('/')

    if (!['ipfs', 'ipns'].includes(protocol) || id == null) {
      throw new Error('Invalid helia-sw value: ' + heliaSw)
    }

    url.pathname = path.join('/') ?? '/'
    url.host = `${id}.${protocol}.${url.host}`
  }
  return url
}
