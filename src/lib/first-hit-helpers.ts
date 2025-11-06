import { checkSubdomainSupport } from './check-subdomain-support.js'
import { Config } from './config-db.js'
import { HASH_FRAGMENTS, QUERY_PARAMS } from './constants.js'
import { getSubdomainParts } from './get-subdomain-parts.js'
import { getHashFragment, hasHashFragment } from './hash-fragments.js'
import { uiLogger } from './logger.js'
import { isPathOrSubdomainRequest, isSubdomainGatewayRequest } from './path-or-subdomain.js'
import type { UrlParts } from './get-subdomain-parts.js'

interface NavigationState {
  isIsolatedOrigin: boolean
  urlHasSubdomainConfigRequest: boolean
  url: URL
  subdomainParts: UrlParts,
  compressedConfig: string | null
  supportsSubdomains: boolean

  config: Config

  /**
   * If the user is requesting content addressed data (instead of service worker
   * gateway UI), this will be true.
   *
   * e.g. NOT the sw-gateway landing page, ipfs-sw-config view,
   * ipfs-sw-origin-isolation-warning view, etc.
   */
  requestForContentAddressedData: boolean

  /**
   * If the user is requesting content addressed data, the current URL is an
   * isolated subdomain, and we already have the config, this will be true if
   * navigator.serviceWorker.controller is null.
   *
   * In this case, we need to reload the page to ensure the service worker
   * captures the request.
   *
   * @see https://www.w3.org/TR/service-workers/#dom-serviceworkercontainer-controller
   */
  isHardRefresh: boolean
}

/**
 * Creates a URL with the ?helia-sw= parameter set to redirect to the desired
 * path, query and hash.
 *
 * When a targetURL is provided, it uses that as a template and preserves its
 * structure, only adding the helia-sw parameter if the originalURL has a
 * non-root path.
 *
 * @param originalURL - The original URL with origin/path/query/hash
 * @param targetURL - Optional URL to use as a template for the redirect (defaults to '/' at originalURL.origin)
 * @returns A new URL object with the helia-sw parameter and other preserved information
 */
export function getHeliaSwRedirectUrl (
  originalURL: URL,
  targetURL?: URL | null
): URL {
  // determine the redirect path to use for the helia-sw parameter
  let pathname = originalURL.pathname

  // decode the path to avoid double-encoding
  try {
    pathname = decodeURIComponent(pathname)
  } catch {
    // if decoding fails, leave the path as is
  }

  const redirect = `${pathname}${originalURL.search}${originalURL.hash}`

  // use the provided targetURL as a template or create a new one at the root of
  // the original origin
  const redirectUrl = targetURL != null ? new URL(targetURL.toString()) : new URL('/', originalURL.origin)

  // cannot use the native URLSearchParams to encode as it uses
  // `application/x-www-form-urlencoded` encoding which encodes " " as "+" and
  // not "%20" so use encodeURIComponent instead
  const search = getSearch(redirectUrl, redirect)

  // preserve hash from redirect URL
  return new URL(`${redirectUrl.protocol}//${redirectUrl.host}${redirectUrl.pathname}${search}${redirectUrl.hash}`)
}

function getSearch (redirectUrl: URL, redirect: string): string {
  const params: Record<string, string> = {}

  for (const [key, value] of redirectUrl.searchParams) {
    params[key] = value
  }

  // set `QUERY_PARAMS.REDIRECT` query parameter, if it's meaningful
  if (redirect != null && redirect !== '/') {
    params[QUERY_PARAMS.REDIRECT] = redirect
  }

  const search = [...Object.entries(params)]
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&')

  if (search === '') {
    return search
  }

  return `?${search}`
}

function isRequestForContentAddressedData (url: URL): boolean {
  if (url.hash.includes(`/${HASH_FRAGMENTS.IPFS_SW_ORIGIN_ISOLATION_WARNING}`)) {
    // hash request for UI pages, not content addressed data
    return false
  }

  if (url.hash.includes(`/${HASH_FRAGMENTS.IPFS_SW_LOAD_UI}`)) {
    // hash request for UI pages, not content addressed data
    return false
  }

  if (url.hash.includes(`/${HASH_FRAGMENTS.IPFS_SW_CONFIG_UI}`)) {
    // is request for the config ui, not content addressed data
    return false
  }

  if (url.hash.includes(`/${HASH_FRAGMENTS.IPFS_SW_ABOUT_UI}`)) {
    // is request for the config ui, not content addressed data
    return false
  }

  if (url.hash.includes(`/${HASH_FRAGMENTS.IPFS_SW_ERROR_UI}`)) {
    // is request for the config ui, not content addressed data
    return false
  }

  if (isPathOrSubdomainRequest(url)) {
    // subdomain request
    return true
  }

  if (url.searchParams.has(QUERY_PARAMS.REDIRECT)) {
    // query param request
    return true
  }

  return false
}

/**
 * Determine the state of the navigation based on the URL and browser context.
 *
 * This is used to determine the next step in the navigation process on
 * first-hit in index.tsx
 */
export async function getStateFromUrl (url: URL): Promise<NavigationState> {
  const { parentDomain, id, protocol } = getSubdomainParts(url.href)
  const isIsolatedOrigin = isSubdomainGatewayRequest(url)
  const urlHasSubdomainConfigRequest = hasHashFragment(url, HASH_FRAGMENTS.IPFS_SW_SUBDOMAIN_REQUEST) && url.searchParams.get(QUERY_PARAMS.REDIRECT) != null
  let isHardRefresh = false
  const config = new Config({
    logger: uiLogger
  }, {
    url
  })
  await config.init()
  const supportsSubdomains = await checkSubdomainSupport(url, config)

  // Check service worker state
  const registration = await navigator.serviceWorker.getRegistration()
  const hasActiveWorker = registration?.active != null
  const hasControllingWorker = navigator.serviceWorker.controller != null

  if (hasActiveWorker && !hasControllingWorker) {
    // this is a hard refresh
    isHardRefresh = true
  }

  return {
    config,
    isIsolatedOrigin,
    urlHasSubdomainConfigRequest,
    url,
    subdomainParts: { parentDomain, id, protocol },
    compressedConfig: getHashFragment(url, HASH_FRAGMENTS.IPFS_SW_CFG),
    supportsSubdomains,
    requestForContentAddressedData: isRequestForContentAddressedData(url),
    isHardRefresh
  }
}
