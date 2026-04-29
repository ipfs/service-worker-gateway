import { GENERATED_HTML_CACHE_CONTROL } from '../../constants.ts'
import { APP_NAME, APP_VERSION, GIT_REVISION } from '../../version.ts'
import { deriveViewerNames, getMediaTypeInfo } from '../lib/media-viewer-types.ts'
import { htmlPage } from './page.ts'
import type { ContentURI } from '../../lib/parse-request.ts'
import type { MediaTypeInfo } from '../lib/media-viewer-types.ts'

/**
 * `decodeURI` raises `URIError` on malformed `%`-sequences. Without this
 * guard a stray `%` in a navigation URL turns into a 500 error page; we'd
 * rather render the viewer with the raw header value than blow up.
 */
function safeDecodeURI (s: string): string {
  try {
    return decodeURI(s)
  } catch {
    return s
  }
}

/**
 * Build the HTML "media viewer" wrapper for top-level navigations to
 * renderable content. Workaround for
 * https://github.com/ipfs/service-worker-gateway/issues/574 (Chromium SW
 * "Save As" bug).
 *
 * Unlike `renderEntityPageResponse`, the body is not embedded. The React
 * component points `<img>`/`<video>`/etc. at the same URL, and that
 * subresource re-fetch arrives at the SW with
 * `request.destination !== 'document'`, skipping the wrapper and returning
 * raw bytes through the existing pipeline.
 */
export function renderMediaViewerPageResponse (request: ContentURI, response: Response, info: MediaTypeInfo): Response {
  const mergedHeaders = new Headers(response.headers)

  mergedHeaders.set('content-type', 'text/html; charset=utf-8')
  mergedHeaders.set('server', `${APP_NAME}/${APP_VERSION}#${GIT_REVISION}`)
  mergedHeaders.delete('content-disposition')
  mergedHeaders.set('cache-control', GENERATED_HTML_CACHE_CONTROL)

  const cid = mergedHeaders.get('x-ipfs-roots')?.split(',').pop() ?? ''
  const ipfsPath = safeDecodeURI(mergedHeaders.get('x-ipfs-path') ?? '')
  const { displayName, filename } = deriveViewerNames(ipfsPath, cid, info)
  const contentType = response.headers.get('content-type') ?? ''
  const contentLengthHeader = response.headers.get('content-length')
  const contentLength = contentLengthHeader != null ? Number(contentLengthHeader) : null

  const props = {
    cid,
    ipfsPath,
    contentType,
    contentLength: Number.isFinite(contentLength) ? contentLength : null,
    kind: info.kind,
    displayName,
    filename,
    // Same URL the page was served from. Subresource re-fetches arrive with
    // `request.destination` set to `image`/`video`/`audio`/`iframe`/... —
    // never `document` — so they skip the wrapper.
    url: request.subdomainURL.toString()
  }

  const page = htmlPage(displayName, 'renderMedia', props)
  // `page.length` is UTF-16 code-unit count, not the UTF-8 byte length the
  // header is supposed to advertise. Inaccurate when `displayName` or
  // `ipfsPath` contains non-ASCII characters. Pre-existing pattern; kept
  // for parity with `renderEntityPageResponse`.
  mergedHeaders.set('content-length', `${page.length}`)
  mergedHeaders.set('etag', `"MediaViewer-${cid}-${info.kind}"`)

  return new Response(page, {
    status: response.status,
    statusText: response.statusText,
    headers: mergedHeaders
  })
}

/**
 * Decide whether a verified-fetch response should be wrapped in the media
 * viewer page. Returns the wrapped response, or `undefined` to let the
 * caller continue down the existing pipeline.
 *
 * Wrapping fires only for top-level navigations (`destination === 'document'`)
 * to renderable content types when the user has not asked for an explicit
 * download or inspector view.
 */
export function tryRenderMediaViewer (
  request: ContentURI,
  response: Response,
  destination: RequestDestination,
  renderHtml: boolean,
  download: string | null
): Response | undefined {
  if (destination !== 'document' || renderHtml || download != null) {
    return undefined
  }

  const info = getMediaTypeInfo(response.headers.get('content-type'))

  if (info == null) {
    return undefined
  }

  return renderMediaViewerPageResponse(request, response, info)
}
