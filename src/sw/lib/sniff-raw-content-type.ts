import { MEDIA_TYPE_RAW } from '@helia/verified-fetch'
import { fileTypeFromBuffer } from 'file-type'

/**
 * Local workaround for verified-fetch's `plugin-handle-raw` not honouring
 * the path-gateway spec's content-type sniffing requirement
 * (https://specs.ipfs.tech/http-gateways/path-gateway/#content-type-response-header,
 * §3.2.4). When the SW strips the browser's wildcard `Accept` and the CID
 * is raw-codec, the plugin returns `application/vnd.ipld.raw` instead of
 * sniffing the bytes; PDFs, PNGs, and MP4s served as single-block raw
 * blocks render as a forced download to `<cid>.raw` rather than inline.
 *
 * This helper re-runs file-type sniffing in our SW after verified-fetch
 * returns. It only acts when:
 *
 * 1. The response Content-Type is `application/vnd.ipld.raw`, AND
 * 2. The user did not explicitly ask for that content-type via
 * `Accept: application/vnd.ipld.raw` or `?format=raw`.
 *
 * If file-type identifies the bytes, the helper returns a new Response
 * with the sniffed Content-Type. Otherwise the original response passes
 * through unchanged.
 *
 * Trustless requests (`?format=raw`, `Accept: application/vnd.ipld.raw`,
 * CAR, dag-json, dag-cbor, etc.) are untouched: the explicit-Accept guard
 * skips them, and other formats never carry `application/vnd.ipld.raw` to
 * begin with.
 *
 * TODO: decide whether to keep this here or push the sniffing into
 * `@helia/verified-fetch`'s `plugin-handle-raw` instead, where it would
 * fix the spec gap for every consumer of verified-fetch. See the issue
 * filed against helia-verified-fetch and remove this helper once the
 * upstream fix lands.
 *
 * TODO: streaming. We currently materialise the full body to a buffer
 * before sniffing. Raw blocks are bounded by Helia's max block size
 * (256 KB by default), so this is fine in practice; but if that ever
 * becomes a concern, switch to `fileTypeFromStream` plus a tee.
 */
export async function sniffRawContentType (response: Response, accept: string | null): Promise<Response> {
  if (response.headers.get('content-type') !== MEDIA_TYPE_RAW) {
    return response
  }

  if (accept != null && accept.includes(MEDIA_TYPE_RAW)) {
    return response
  }

  if (response.body == null) {
    return response
  }

  const body = new Uint8Array(await response.arrayBuffer())
  const detected = await fileTypeFromBuffer(body)

  if (detected == null) {
    // file-type can't identify the bytes; serve them as raw, matching the
    // (admittedly underspecified) status quo. Returning a fresh Response
    // with the buffered body since `arrayBuffer()` consumed the original.
    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    })
  }

  const headers = new Headers(response.headers)
  headers.set('content-type', detected.mime)
  // The original Content-Length came from plugin-handle-raw; the body
  // bytes are unchanged so the length stays correct.

  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}
