interface HashFragments {
  [key: string]: string | null
}

/**
 * Parse hash fragments from a URL hash string
 *
 * @returns An object with key-value pairs from the hash fragments
 */
export function parseHashFragments (hash: string): HashFragments {
  const fragments: HashFragments = {}

  if (!hash || hash === '') {
    return fragments
  }

  // remove the leading # if present
  const hashString = hash.startsWith('#') ? hash.slice(1) : hash

  // split by & and parse each fragment
  const pairs = hashString.split('&')
  for (const pair of pairs) {
    const [key, value = null] = pair.split('=')
    if (key != null) {
      fragments[decodeURIComponent(key)] = value === null ? null : decodeURIComponent(value)
    }
  }

  return fragments
}

/**
 * Get a specific hash fragment value from a URL
 *
 * @returns The value of the hash fragment, or null if not found
 */
export function getHashFragment (url: URL, key: string): string | null {
  const fragments = parseHashFragments(url.hash)
  if (fragments[key] != null) {
    return decodeURIComponent(fragments[key])
  }

  return null
}

/**
 * Convert a hash fragment object to a string
 */
export function hashFragmentsToString (fragments: HashFragments): string {
  const pairs = Object.entries(fragments).map(([k, v]) => {
    if (v != null) {
      return `${k}=${encodeURIComponent(v)}`
    }

    return `${k}`
  })
  return pairs.length > 0 ? `#${pairs.join('&')}` : ''
}

/**
 * Set a hash fragment on a URL. Modifies the URL in place.
 */
export function setHashFragment (url: URL, key: string, value: string | null): void {
  const fragments = parseHashFragments(url.hash)
  fragments[key] = value

  url.hash = hashFragmentsToString(fragments)
}

/**
 * Delete a hash fragment from a URL. Modifies the URL in place.
 */
export function deleteHashFragment (url: URL, key: string): void {
  const fragments = parseHashFragments(url.hash)
  delete fragments[key]

  url.hash = hashFragmentsToString(fragments)
}

/**
 * Check if a hash fragment exists in a URL
 *
 * @returns true if the hash fragment exists
 */
export function hasHashFragment (url: URL, key: string): boolean {
  const fragments = parseHashFragments(url.hash)
  return key in fragments
}
