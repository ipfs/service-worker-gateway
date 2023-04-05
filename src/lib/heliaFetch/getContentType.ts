import FileType from 'file-type/core'

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
export async function getContentType ({ cid, bytes }: { cid?: unknown, bytes: Uint8Array }): Promise<string> {
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
