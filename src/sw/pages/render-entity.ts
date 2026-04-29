import { MEDIA_TYPE_DAG_PB } from '@helia/verified-fetch'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { GENERATED_HTML_CACHE_CONTROL } from '../../constants.ts'
import { headersToObject } from '../../lib/headers-to-object.ts'
import { APP_NAME, APP_VERSION, GIT_REVISION } from '../../version.ts'
import { htmlPage } from './page.ts'
import type { ContentURI } from '../../lib/parse-request.ts'

/**
 * Renders the properties of the object deserialized from the block
 */
export function renderEntityPageResponse (request: ContentURI, headers: Headers, response: Response, entity: ArrayBuffer): Response {
  const mergedHeaders = new Headers(response.headers)
  const contentType = mergedHeaders.get('content-type')

  mergedHeaders.set('content-type', 'text/html; charset=utf-8')
  mergedHeaders.set('server', `${APP_NAME}/${APP_VERSION}#${GIT_REVISION}`)
  mergedHeaders.delete('content-disposition')
  mergedHeaders.set('cache-control', GENERATED_HTML_CACHE_CONTROL)

  const props = {
    cid: mergedHeaders.get('x-ipfs-roots')?.split(',').pop() ?? '',
    ipfsPath: decodeURI(mergedHeaders.get('x-ipfs-path') ?? ''),
    entity: uint8ArrayToString(new Uint8Array(entity, 0, entity.byteLength), 'base64'),
    contentType,
    request: {
      url: request.subdomainURL.toString(),
      headers: headersToObject(headers)
    },
    response: {
      url: response.url,
      headers: headersToObject(response.headers)
    }
  }

  const page = htmlPage(props.cid ?? '', 'renderEntity', props)
  // `page.length` is UTF-16 code-unit count, not the UTF-8 byte length the
  // header is supposed to advertise. Inaccurate when injected props contain
  // non-ASCII characters (e.g. a non-ASCII path segment).
  mergedHeaders.set('content-length', `${page.length}`)

  if (contentType === MEDIA_TYPE_DAG_PB) {
    mergedHeaders.set('etag', `"DirIndex-.*_CID-${props.cid}"`)
  } else {
    mergedHeaders.set('etag', `"DagIndex-${props.cid}"`)
  }

  return new Response(page, {
    status: response.status,
    statusText: response.statusText,
    headers: mergedHeaders
  })
}
