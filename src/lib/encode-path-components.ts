/**
 * IPFS path segments can include non-URL safe characters like # and ? so escape
 * them so IPFS paths be appended to URLs
 */
export function encodePathComponents (str: string | string[]): string {
  if (!Array.isArray(str)) {
    str = str.split('/')
  }

  return str
    .filter(segment => segment.trim() !== '')
    .map(segment => encodeURIComponent(segment))
    .join('/')
}
