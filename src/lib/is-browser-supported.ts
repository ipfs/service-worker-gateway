/**
 * The gateway needs these Web APIs; when one is missing the UI shows an
 * "update your browser" page instead of failing later with an opaque error.
 *
 * - `Promise.withResolvers` (Chrome 119, Firefox 121, Safari 17.4)
 * - non-special-scheme URL parsing, so `new URL('ipfs://cid').hostname` is the CID (Chrome 130, Firefox 122, Safari 18.x)
 */
export function isBrowserSupported (): boolean {
  if (!('withResolvers' in Promise)) {
    return false
  }

  try {
    return new URL('ipfs://host').hostname === 'host'
  } catch {
    return false
  }
}
