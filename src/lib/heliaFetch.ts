import type { Helia } from '@helia/interface'
import { unixfs } from '@helia/unixfs'
import { CID } from 'multiformats/cid'
import FileType from 'file-type/core'

// import { getHelia } from '../get-helia.ts'

export interface HeliaFetchOptions {
  path: string
  helia: Helia
}

function mergeUint8Arrays (a: Uint8Array, b: Uint8Array): Uint8Array {
  const c = new Uint8Array(a.length + b.length)
  c.set(a, 0)
  c.set(b, a.length)
  return c
}

/**
 * Test files:
 * bafkreienxxjqg3jomg5b75k7547dgf7qlbd3qpxy2kbg537ck3rol4mcve  - text            - https://bafkreienxxjqg3jomg5b75k7547dgf7qlbd3qpxy2kbg537ck3rol4mcve.ipfs.w3s.link/?filename=test.txt
 * bafkreicafxt3zr4cshf7qteztjzl62ouxqrofu647e44wt7s2iaqjn7bra  - image/jpeg      - http://127.0.0.1:8080/ipfs/bafkreicafxt3zr4cshf7qteztjzl62ouxqrofu647e44wt7s2iaqjn7bra?filename=bafkreicafxt3zr4cshf7qteztjzl62ouxqrofu647e44wt7s2iaqjn7bra
 * QmY7fzZEpgDUqZ7BEePSS5JxxezDj3Zy36EEpWSmKmv5mo               - image/jpeg      - http://127.0.0.1:8080/ipfs/QmY7fzZEpgDUqZ7BEePSS5JxxezDj3Zy36EEpWSmKmv5mo?filename=QmY7fzZEpgDUqZ7BEePSS5JxxezDj3Zy36EEpWSmKmv5mo
 * bafkreif4ufrfpfcmqn5ltjvmeisgv4k7ykqz2mjygpngtwt4bijxosidqa  - image/svg+xml   - https://bafkreif4ufrfpfcmqn5ltjvmeisgv4k7ykqz2mjygpngtwt4bijxosidqa.ipfs.dweb.link/?filename=Web3.Storage-logo.svg
 * bafybeiekildl23opzqcsufewlbadhbabs6pyqg35tzpfavgtjyhchyikxa  - video/quicktime - https://bafybeiekildl23opzqcsufewlbadhbabs6pyqg35tzpfavgtjyhchyikxa.ipfs.dweb.link
 * bafkreiezuss4xkt5gu256vjccx7vocoksxk77vwmdrpwoumfbbxcy2zowq  - video/webm (147.78 KiB)    - https://bafkreiezuss4xkt5gu256vjccx7vocoksxk77vwmdrpwoumfbbxcy2zowq.ipfs.dweb.link
 * bafybeierkpfmf4vhtdiujgahfptiyriykoetxf3rmd3vcxsdemincpjoyu  - video/mp4 (2.80 MiB)    - https://bafybeierkpfmf4vhtdiujgahfptiyriykoetxf3rmd3vcxsdemincpjoyu.ipfs.dweb.link
 */

function isSvgText (bytes: Uint8Array): boolean {
  const svgText = new TextDecoder().decode(bytes.slice(0, 4))
  return svgText.startsWith('<svg')
}

function handleVideoMimeTypes (videoMimeType: string): string {
  // console.log('videoMimeType: ', videoMimeType)
  // return 'video/webm;codecs=h264'
  switch (videoMimeType) {
    // case 'video/mp4':
    //   return 'video/webm;codecs=h264'
    case 'video/quicktime':
      return 'video/mp4'
    default:
      return videoMimeType
  }
}

/**
 * TODO: support video files (v0=playable, v1=seekable and navigable)
 * TODO: support audio files
 *
 * @param param0
 *
 * For inspiration
 * @see https://github.com/ipfs/js-ipfs/blob/master/packages/ipfs-http-response/src/utils/content-type.js
 * @see https://github.com/RangerMauve/js-ipfs-fetch
 * @returns
 */
async function getContentType ({ cid, bytes }: { cid?: unknown, bytes: Uint8Array }): Promise<string> {
  // const fileType = magicBytesFiletype(bytes)
  // console.log('magicBytesFiletype(bytes): ', magicBytesFiletype(bytes))
  const fileTypeDep = await FileType.fromBuffer(bytes)
  if (typeof fileTypeDep !== 'undefined') {
    // console.log('fileTypeDep.mime: ', fileTypeDep.mime)
    return handleVideoMimeTypes(fileTypeDep.mime)
  }

  if (isSvgText(bytes)) {
    return 'image/svg+xml'
  }

  return 'text/plain'
}

/**
 * * TODO: implement as much of the gateway spec as possible.
 * * TODO: why we would be better than ipfs.io/other-gateway
 * * TODO: have error handling that renders 404/500/other if the request is bad.
 *
 * @param event
 * @returns
 */
export async function heliaFetch ({ path, helia }: HeliaFetchOptions): Promise<Response> {
  const pathParts = path.split('/')
  // console.log('pathParts: ', pathParts)
  // const scheme = pathParts[1]
  // console.log('scheme: ', scheme)
  const cidString = pathParts[2]
  // console.log('cidString: ', cidString)
  // const helia = await getHelia({ libp2pConfigType: 'ipni' })

  const fs = unixfs(helia)
  const cid = CID.parse(cidString)

  const asyncIt = fs.cat(cid)

  const iter = asyncIt[Symbol.asyncIterator]()

  let next = iter.next
  next = next.bind(iter)

  // we have to get the first chunk before responding or else the response has the incorrect content type
  const firstChunk = await next()

  const fileType: string = await getContentType({ bytes: firstChunk.value })
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
  return new Response(readableStream, {
    headers: {
      'Cache-Control': 'public, max-age=29030400, immutable', // same as ipfs.io gateway
      // 'Cache-Control': 'no-cache', // disable caching when debugging
      'Content-Type': fileType ?? 'text/plain'
    }

  })
}
