import { QUERY_PARAMS } from './constants.js'
import { isUIPageRequest } from './is-ui-page-request.js'
import { isPathOrSubdomainRequest } from './path-or-subdomain.js'

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

  return formatSearch(params)
}

export interface CreateSearchOptions {
  params?: Record<string, string>
  filter?(key: string, value: string): boolean
}

export function createSearch (searchParams: URLSearchParams, options?: CreateSearchOptions): string {
  const params: Record<string, string> = options?.params ?? {}

  for (const [key, value] of searchParams) {
    if (options?.filter?.(key, value) === false) {
      continue
    }

    params[key] = value
  }

  return formatSearch(params)
}

/**
 * Turns a record of key/value pairs into a URL-safe search params string
 */
export function formatSearch (params: Record<string, string>): string {
  const search = [...Object.entries(params)]
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&')

  if (search === '') {
    return search
  }

  return `?${search}`
}

export function isRequestForContentAddressedData (url: URL): boolean {
  if (isUIPageRequest(url)) {
    // hash request for UI pages, not content addressed data
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
