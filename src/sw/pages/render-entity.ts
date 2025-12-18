import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { headersToObject } from '../../lib/headers-to-object.ts'
import { APP_NAME, APP_VERSION, GIT_REVISION } from '../../version.js'
import { htmlPage } from './page.js'

/**
 * Shows an error page to the user
 */
export function renderEntityPageResponse (url: URL, headers: Headers, response: Response, entity: ArrayBuffer): Response {
  const mergedHeaders = new Headers(response.headers)
  const contentType = mergedHeaders.get('content-type')

  mergedHeaders.set('content-type', 'text/html; charset=utf-8')
  mergedHeaders.set('server', `${APP_NAME}/${APP_VERSION}#${GIT_REVISION}`)
  mergedHeaders.delete('content-disposition')

  const props = {
    cid: mergedHeaders.get('x-ipfs-roots')?.split(',').pop() ?? '',
    ipfsPath: decodeURI(mergedHeaders.get('x-ipfs-path') ?? ''),
    entity: uint8ArrayToString(new Uint8Array(entity, 0, entity.byteLength), 'base64'),
    contentType,
    request: {
      url: url.toString(),
      headers: headersToObject(headers)
    },
    response: {
      url: response.url,
      headers: headersToObject(response.headers)
    }
  }

  const page = htmlPage(props.cid ?? '', 'renderEntity', props)
  mergedHeaders.set('content-length', `${page.length}`)

  return new Response(page, {
    status: response.status,
    statusText: response.statusText,
    headers: mergedHeaders
  })
}
