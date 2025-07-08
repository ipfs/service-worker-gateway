import { checkSubdomainSupport } from './check-subdomain-support.js'
import { areSubdomainsSupported, isConfigSet } from './config-db.js'
import { HASH_FRAGMENTS } from './constants.js'
import { getSubdomainParts } from './get-subdomain-parts.js'
import { getHashFragment, setHashFragment, deleteHashFragment, hasHashFragment } from './hash-fragments.js'
import { uiLogger } from './logger.js'
import { findOriginIsolationRedirect, isPathGatewayRequest, isSubdomainGatewayRequest } from './path-or-subdomain.js'
import type { UrlParts } from './get-subdomain-parts.js'

interface NavigationState {
  subdomainHasConfig: boolean
  isIsolatedOrigin: boolean
  urlHasSubdomainConfigRequest: boolean
  url: URL
  subdomainParts: UrlParts,
  compressedConfig: string | null
  heliaSw: string | null
  supportsSubdomains: boolean
}

const log = uiLogger.forComponent('first-hit-helpers')

/**
 * This function ensures that we are on the correct path before registering the service worker.
 *
 * If we are on a subdomain with a path, we redirect to the subdomain root with a #helia-sw= parameter.
 * If we are on a path gateway request, we check if subdomains are supported and redirect to the subdomain root with a #helia-sw= parameter.
 */
export async function ensureSwScope (): Promise<void> {
  // Handle first-hit requests to a subdomain with a path
  if (isSubdomainGatewayRequest(window.location) && window.location.pathname !== '/') {
    log.trace('first-hit on subdomain with path, redirecting to subdomain root')
    // For first-hit on subdomain with path, redirect to the subdomain root with a #helia-sw= parameter
    const url = new URL(window.location.href)
    const originalPath = url.pathname
    url.pathname = '/'
    // url.searchParams.set(HASH_FRAGMENTS.HELIA_SW, originalPath)
    setHashFragment(url, HASH_FRAGMENTS.HELIA_SW, originalPath)
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
      // url.searchParams.set(HASH_FRAGMENTS.HELIA_SW, window.location.pathname)
      setHashFragment(url, HASH_FRAGMENTS.HELIA_SW, window.location.pathname)
      window.location.replace(url.toString())
    }
  }
}

/**
 * This function creates a URL with the #helia-sw= parameter set to redirect to the desired path.
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
    // redirectUrl.searchParams.set(QUERY_PARAMS.HELIA_SW, path)
    setHashFragment(redirectUrl, HASH_FRAGMENTS.HELIA_SW, path)
  }

  // Preserve existing query parameters from pathURL
  query.forEach((value, key) => {
    if (!(targetURL !== null && targetURL !== undefined && redirectUrl.searchParams.has(key))) {
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
 * Based on the URL, determine the state of the navigation that we want.
 *
 * This is used to determine the next step in the navigation process on first-hit in index.tsx.
 */
export async function getStateFromUrl (url: URL): Promise<NavigationState> {
  const { parentDomain, id, protocol } = getSubdomainParts(url.href)
  const isIsolatedOrigin = parentDomain != null && parentDomain !== url.host && id != null
  const urlHasSubdomainConfigRequest = hasHashFragment(url, HASH_FRAGMENTS.IPFS_SW_SUBDOMAIN_REQUEST) && getHashFragment(url, HASH_FRAGMENTS.HELIA_SW) != null
  let subdomainHasConfig = false
  const heliaSw = getHashFragment(url, HASH_FRAGMENTS.HELIA_SW)
  await checkSubdomainSupport()
  const supportsSubdomains = await areSubdomainsSupported(uiLogger)

  if (isIsolatedOrigin) {
    // check if indexedDb has config
    subdomainHasConfig = await isConfigSet(uiLogger)
  }

  return {
    subdomainHasConfig,
    isIsolatedOrigin,
    urlHasSubdomainConfigRequest,
    url,
    subdomainParts: { parentDomain, id, protocol },
    compressedConfig: getHashFragment(url, HASH_FRAGMENTS.IPFS_SW_CFG),
    heliaSw,
    supportsSubdomains: supportsSubdomains ?? false
  } satisfies NavigationState
}

/**
 * When landing on a subdomain page for the first time, we need to redirect to the root domain with a request for the config.
 *
 * This function should not run if the service worker is already registered on that subdomain.
 */
export async function getConfigRedirectUrl ({ url, isIsolatedOrigin, urlHasSubdomainConfigRequest, compressedConfig, subdomainParts }: NavigationState): Promise<string | null> {
  const { parentDomain, id, protocol } = subdomainParts

  if (isIsolatedOrigin && !urlHasSubdomainConfigRequest && compressedConfig == null) {
    // We are on a subdomain: redirect to the root domain with the subdomain request hash fragment
    const targetUrl = new URL(`${url.protocol}//${parentDomain}`)
    targetUrl.pathname = '/'
    targetUrl.hash = url.hash
    targetUrl.search = url.search
    setHashFragment(targetUrl, HASH_FRAGMENTS.IPFS_SW_SUBDOMAIN_REQUEST, 'true')

    // helia-sw may already be in the query parameters from the go binary or cloudflare or other service, so we need to add it to the target URL
    const heliaSw = getHashFragment(url, HASH_FRAGMENTS.HELIA_SW)
    if (heliaSw != null) {
      // targetUrl.searchParams.set(QUERY_PARAMS.HELIA_SW, `/${protocol}/${id}${url.pathname}${heliaSw}`)
      setHashFragment(targetUrl, HASH_FRAGMENTS.HELIA_SW, `/${protocol}/${id}${url.pathname}${heliaSw}`)
    } else {
      // targetUrl.searchParams.set(QUERY_PARAMS.HELIA_SW, `/${protocol}/${id}${url.pathname}`)
      setHashFragment(targetUrl, HASH_FRAGMENTS.HELIA_SW, `/${protocol}/${id}${url.pathname}`)
    }

    return targetUrl.toString()
  }

  return null
}

/**
 * If we are on the root domain, and have been requested by a subdomain to fetch the config and pass it back to them,
 * we need to compress the config and set it as a hash fragment on the URL.
 */
export async function getUrlWithConfig ({ url, isIsolatedOrigin, urlHasSubdomainConfigRequest }: NavigationState): Promise<string | null> {
  if (!isIsolatedOrigin && urlHasSubdomainConfigRequest) {
    const { compressConfig, getConfig } = await import('./config-db.js')
    const { toSubdomainRequest } = await import('./path-or-subdomain.js')
    const { translateIpfsRedirectUrl } = await import('./translate-ipfs-redirect-url.js')
    // we are on the root domain, and have been requested by a subdomain to fetch the config and pass it back to them.
    deleteHashFragment(url, HASH_FRAGMENTS.IPFS_SW_SUBDOMAIN_REQUEST)
    const config = await getConfig(uiLogger)
    const compressedConfig = await compressConfig(config)
    setHashFragment(url, HASH_FRAGMENTS.IPFS_SW_CFG, compressedConfig)

    // translate the url with helia-sw to a path based URL, and then to the proper subdomain URL
    const translatedUrl = translateIpfsRedirectUrl(url)

    const subdomainRequestUrl = toSubdomainRequest(translatedUrl)

    return subdomainRequestUrl
  }

  return null
}

/**
 * After receiving the config from the root domain, we need to decompress it and load in into IndexedDB on the subdomain.
 */
export async function loadConfigFromUrl ({ url, compressedConfig }: NavigationState): Promise<string | null> {
  if (compressedConfig == null) {
    return null
  }
  const { decompressConfig, setConfig } = await import('./config-db.js')
  const { translateIpfsRedirectUrl } = await import('./translate-ipfs-redirect-url.js')
  const { registerServiceWorker } = await import('../service-worker-utils.js')

  try {
    const config = await decompressConfig(compressedConfig)
    deleteHashFragment(url, HASH_FRAGMENTS.IPFS_SW_CFG)
    await setConfig(config, uiLogger)
    await registerServiceWorker()
    return translateIpfsRedirectUrl(url).toString()
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('helia:sw-gateway:index: error decompressing config from url', err)
  }

  return null
}
