import { acceptMatchesContentType } from './accept-matches-content-type.js'

/**
 * Safari has trouble rendering binary content (e.g. images/videos)
 * during top-level navigations if the Accept header doesn't explicitly match.
 * This detects those cases and should result in a redirect to ipfs-sw-content-viewer.html as a workaround.
 */
export function needsContentViewer ({ response, event }: { response: Response, event: FetchEvent }): boolean {
  const request = event.request

  if (request.mode !== 'navigate' || request.destination !== 'document') {
    return false // not a top-level navigation
  }

  const userAgent = request.headers.get('user-agent')
  if (!(userAgent === null || userAgent?.includes('Safari')) || userAgent?.includes('Chrome') || userAgent?.includes('Chromium')) {
    return false // not Safari
  }

  const contentDisposition = response.headers.get('content-disposition')
  const isDownloadRequest = contentDisposition != null && contentDisposition.includes('inline;') === false
  if (isDownloadRequest) {
    return false // it's a forced download
  }

  const contentType = response.headers.get('content-type')
  if (!/^(image|video|audio)\//.test(contentType ?? '')) {
    return false // not a renderable type
  }
  const acceptHeader = request.headers.get('accept')
  if (acceptMatchesContentType(acceptHeader, contentType) === true) {
    return false // accept header matches content type, any browser should render it properly
  }

  // We have not exited early, so we likely need to return a content viewer.
  return true
}
