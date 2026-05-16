/**
 * `decodeURI` raises `URIError` on malformed `%`-sequences. Without this
 * guard a stray `%` in a navigation URL turns into a 500 error page; we'd
 * rather render the viewer with the raw header value than blow up.
 */
export function safeDecodeURI (s: string): string {
  try {
    return decodeURI(s)
  } catch {
    return s
  }
}
