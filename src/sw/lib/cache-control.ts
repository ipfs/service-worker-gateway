import { parseHeaderDirectives } from './header-directives.ts'
import type { HeaderDirectives } from './header-directives.ts'

const ONE_HOUR_IN_SECONDS = 3_600

/**
 * Calculate how many seconds a response is valid for based on RFC 9111
 *
 * @see https://httpwg.org/specs/rfc9111.html#calculating.freshness.lifetime
 */
function findTtl (response: Response): number {
  const dateHeader = response.headers.get('date')

  // if we do not know when we received the response, we cannot calculate how
  // long it has to live
  if (dateHeader == null) {
    return ONE_HOUR_IN_SECONDS
  }

  return getResponseMaxAge(response) ?? getResponseExpiry(response) ?? ONE_HOUR_IN_SECONDS
}

/**
 * Try to read how long the response should be cached from the cache-control
 * header, if it is present
 */
function getResponseMaxAge (response: Response): number | undefined {
  const header = response.headers.get('cache-control')

  // ignore if no cache control header is present
  if (header == null) {
    return
  }

  const cacheControl = parseHeaderDirectives(header)
  const maxAge = cacheControl['max-age']

  // a cache-control header can be present without a max-age directive
  // (e.g. `public`), in which case there is no max-age TTL to read here
  if (maxAge == null) {
    return
  }

  const seconds = parseInt(maxAge.toString(), 10)

  // Caches are encouraged to consider responses that have invalid freshness
  // information (e.g., a max-age directive with non-integer content) to be
  // stale.
  // https://httpwg.org/specs/rfc9111.html#calculating.freshness.lifetime
  if (isNaN(seconds) || seconds.toString() !== maxAge.toString()) {
    return 0
  }

  // max-age is the freshness lifetime; the Age header is accounted for in
  // findAge, so do not subtract it here as well
  return seconds
}

/**
 * Calculate the TTL for a response based on the Expiry header (if present)
 * minus the current Date.
 *
 * Prefer the Date header from the response if present to reduce clock skew.
 */
function getResponseExpiry (response: Response): number | undefined {
  const expires = response.headers.get('expires')
  const date = new Date(response.headers.get('date') ?? Date.now())

  if (expires == null) {
    return
  }

  // Date.getTime() is in milliseconds, but every TTL in this module is in
  // seconds, so convert before returning
  const ttl = Math.round((new Date(expires).getTime() - date.getTime()) / 1000)

  // invalid or negative values mean the response has no usable expiry
  if (isNaN(ttl) || ttl < 0) {
    return
  }

  return ttl
}

/**
 * Returns true if the previously cached response cannot be used to respond to
 * a request
 */
export function needsRevalidateBeforeUse (response: Response): boolean {
  const cacheControl = parseHeaderDirectives(response.headers.get('cache-control'))

  // no-cache means 'always revalidate', 'no-store' means do not cache
  if (cacheControl['no-cache'] === true || cacheControl['no-store'] === true) {
    return true
  }

  // the response is cached and within the TTL so no need to revalidate
  if (isFresh(response, cacheControl)) {
    return false
  }

  // not fresh & cannot use stale response - we must revalidate
  return !canUseStale(response, cacheControl)
}

/**
 * In HTTP caching terms, a fresh response is one that can usually be reused for
 * subsequent requests, depending on request directives, otherwise it is stale
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching#fresh_and_stale_based_on_age
 */
function isFresh (response: Response, cacheControl: HeaderDirectives): boolean {
  if (cacheControl['no-cache'] === true || cacheControl['no-store'] === true) {
    return false
  }

  if (cacheControl['must-revalidate'] === true) {
    return false
  }

  const age = findAge(response)
  const ttl = findTtl(response)

  return age < ttl
}

function canUseStaleWhileRevalidate (response: Response, cacheControl: HeaderDirectives): boolean {
  const staleWhileRevalidate = parseInt(cacheControl['stale-while-revalidate']?.toString(), 10)

  // ignore invalid stale-while-revalidate values
  if (isNaN(staleWhileRevalidate) || staleWhileRevalidate < 0 || Math.round(staleWhileRevalidate).toString() !== cacheControl['stale-while-revalidate']) {
    return false
  }

  const age = findAge(response)
  const ttl = findTtl(response)

  // `stale-while-revalidate` value extends the normal TTL for the response
  return age < (ttl + staleWhileRevalidate)
}

/**
 * Return true if the stale response can be used, otherwise return false
 */
function canUseStale (response: Response, cacheControl: HeaderDirectives): boolean {
  // must-revalidate means revalidate when stale
  if (cacheControl['must-revalidate'] === true) {
    return false
  }

  // the immutable response directive indicates that the response will not be
  // updated while it's fresh so we must revalidate once stale
  if (cacheControl['immutable']) {
    return false
  }

  // `stale-while-revalidate` directive extends the normal TTL for the response
  return canUseStaleWhileRevalidate(response, cacheControl)
}

export function needsRevalidateAfterUse (response: Response): boolean {
  const cacheControl = parseHeaderDirectives(response.headers.get('cache-control'))
  const fresh = isFresh(response, cacheControl)

  // not stale, no need to revalidate
  if (fresh) {
    return false
  }

  // `stale-while-revalidate` value extends the normal TTL for the response
  return canUseStaleWhileRevalidate(response, cacheControl)
}

/**
 * For certain error response codes, it can be possible to re-use a previously
 * cached stale response
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control#stale-if-error
 */
export function canUseStaleResponseOnError (errorResponse: Response, cachedResponse: Response): boolean {
  if (![500, 502, 503, 504].includes(errorResponse.status)) {
    return false
  }

  const cacheControl = parseHeaderDirectives(cachedResponse.headers.get('cache-control'))
  const staleIfError = parseInt(cacheControl['stale-if-error']?.toString(), 10)

  // ignore invalid stale-if-error values
  if (isNaN(staleIfError) || staleIfError < 0 || Math.round(staleIfError).toString() !== cacheControl['stale-if-error']) {
    return false
  }

  const age = findAge(cachedResponse)
  const ttl = findTtl(cachedResponse)

  // `stale-if-error` value extends the normal TTL for the response
  return age < (ttl + staleIfError)
}

/**
 * Find the age in seconds of a previously cached response
 */
function findAge (response: Response): number {
  const ageHeader = response.headers.get('age')
  const dateHeader = response.headers.get('date')

  // if no date header is present, we don't know when we received the response
  // so cannot calculate the age
  if (dateHeader == null) {
    return 0
  }

  const received = Math.round(new Date(dateHeader).getTime() / 1000)
  const now = Math.round(Date.now() / 1000)

  // the age header is how old the response was in seconds when we received it
  if (ageHeader != null) {
    const age = parseInt(ageHeader, 10)

    // cannot parse invalid age
    if (isNaN(age) || age < 0) {
      return 0
    }

    return (now - received) + age
  }

  // return the difference between now and the time we received the response
  return now - received
}
