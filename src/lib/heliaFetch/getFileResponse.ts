import type { Helia } from '@helia/interface'
import type { UnixFS } from '@helia/unixfs'
import type { CID, Version } from 'multiformats/cid'

import { getContentType } from './getContentType.ts'

export interface GetFileResponseOptions {
  cid: CID<unknown, number, number, Version>
  fs: UnixFS
  helia: Helia
  signal?: AbortSignal
  headers?: Headers
  path?: string
}

export async function getFileResponse ({ cid, path, fs, helia, signal, headers }: GetFileResponseOptions): Promise<Response> {
  const asyncIt = fs.cat(cid, { path, signal })

  // Handle Byte Range requests (https://tools.ietf.org/html/rfc7233#section-2.1)
  // const catOptions = {}
  const rangeResponse = false
  // if (headers?.has('range') === true) {
  //   // If-Range is respected (when present), but we compare it only against Etag
  //   // (Last-Modified date is too weak for IPFS use cases)
  //   if (headers['if-range'] === false || headers['if-range'] === etag) {
  //     // TODO: implement https://github.com/ipfs/js-ipfs/blob/b64d4af034f27aa7204e57e6a79f95461095502c/packages/ipfs-http-gateway/src/resources/gateway.js#L115
  //     console.log('TODO: implement ranges')
  //     // const ranges = Ammo.header(headers.range, size)
  //     // if (!ranges) {
  //     //   const error = Boom.rangeNotSatisfiable()
  //     //   error.output.headers['content-range'] = `bytes */${size}`
  //     //   throw error
  //     // }

  //     // if (ranges.length === 1) { // Ignore requests for multiple ranges (hard to map to ipfs.cat and not used in practice)
  //     //   rangeResponse = true
  //     //   const range = ranges[0]
  //     //   catOptions.offset = range.from
  //     //   catOptions.length = (range.to - range.from + 1)
  //     // }
  //   }
  // }

  const iter = asyncIt[Symbol.asyncIterator]()

  let next = iter.next
  next = next.bind(iter)

  // we have to get the first chunk before responding or else the response has the incorrect content type
  const firstChunk = await next()

  const fileType: string = await getContentType({ path, bytes: firstChunk.value })
  // if (typeof chunkFileType !== 'undefined') {
  //   fileType = handleVideoMimeTypes(chunkFileType.mime)
  // }

  // let bytes: Uint8Array = new Uint8Array()
  // let chunkFiletype: FileType.FileTypeResult | undefined
  const readableStream = new ReadableStream({
    async start (controller) {
      controller.enqueue(firstChunk.value)
      // if (fileType == null) {
      // }

      if (firstChunk.done === true) {
        controller.close()
        return
      }
      for (let { value, done } = await next(); done === false; { value, done } = await next()) {
      // for await (const chunk of fs.cat(cid)) {
        const chunk = value
        // console.log('chunk: ', chunk)
        controller.enqueue(chunk)
      }
      // console.log('final fileType: ', fileType)
      controller.close()
    }
  })

  // need to return byte stream
  const response = new Response(readableStream, {
    status: rangeResponse ? 206 : 200,
    headers: {
      etag: cid.toString(),
      'Cache-Control': 'public, max-age=29030400, immutable', // same as ipfs.io gateway
      // 'Cache-Control': 'no-cache', // disable caching when debugging
      'Content-Type': fileType ?? 'text/plain'
    }
  })

  // if (rangeResponse) {
  //   const from = catOptions.offset
  //   const to = catOptions.offset + catOptions.length - 1
  //   response.headers.set('Content-Range', `bytes ${from}-${to}/${size}`)
  //   response.header('Content-Length', `${catOptions.length}`)
  // } else {
  //   // Announce support for Range requests
  //   response.headers.set('Accept-Ranges', 'bytes')
  //   response.headers.set('Content-Length', `${size}`)
  // }

  return response
}
