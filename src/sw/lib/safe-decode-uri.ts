/**
 * `decodeURI` raises `URIError` on malformed `%`-sequences. Without this
 * guard a stray `%` in a navigation URL turns into a 500 error page; we'd
 * rather render the viewer with the raw header value than blow up.
 */
export function safeDecodeURI (s: string): string {
  try {
    const url = new URL(s)

    let pathname = url.pathname.split('/')
      .map(component => decodeURIComponent(component))
      .join('/')

    if (pathname.length > 0 && !pathname.startsWith('/')) {
      pathname = `/${pathname}`
    }

    if (pathname === '/') {
      pathname = ''
    }

    return `/${url.protocol === 'ipfs:' ? 'ipfs' : 'ipns'}/${url.hostname}${pathname}`
  } catch {
    return s
  }
}
