import { HASH_FRAGMENTS } from './constants.js'

export function isUIPageRequest (url: URL): boolean {
  return Object.values(HASH_FRAGMENTS)
    .some(page => url.hash.startsWith(`#/${page}`))
}
