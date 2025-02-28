import { type ContentTypeParser } from '@helia/verified-fetch'
import { fileTypeFromBuffer } from '@sgtpooki/file-type'

// default from verified-fetch is application/octect-stream, which forces a download. This is not what we want for MANY file types.
export const defaultMimeType = 'text/html'

function checkForSvg (bytes: Uint8Array): boolean {
  return /^(<\?xml[^>]+>)?[^<^\w]+<svg/ig.test(new TextDecoder().decode(bytes.slice(0, 64)))
}

async function checkForJson (bytes: Uint8Array): Promise<boolean> {
  try {
    JSON.parse(new TextDecoder().decode(bytes))
    return true
  } catch (err) {
    return false
  }
}

export const contentTypeParser: ContentTypeParser = async (bytes, fileName) => {
  const detectedType = (await fileTypeFromBuffer(bytes))?.mime
  if (detectedType != null) {
    return detectedType
  }

  if (fileName == null) {
    // no other way to determine file-type.
    if (checkForSvg(bytes)) {
      return 'image/svg+xml'
    } else if (await checkForJson(bytes)) {
      return 'application/json'
    }
    return defaultMimeType
  }

  // no need to include file-types listed at https://github.com/SgtPooki/file-type#supported-file-types
  switch (fileName.split('.').pop()) {
    case 'css':
      return 'text/css'
    case 'html':
      return 'text/html'
    case 'js':
      return 'application/javascript'
    case 'json':
      return 'application/json'
    case 'txt':
      return 'text/plain'
    case 'woff2':
      return 'font/woff2'
    // see bottom of https://github.com/SgtPooki/file-type#supported-file-types
    case 'svg':
      return 'image/svg+xml'
    case 'csv':
      return 'text/csv'
    case 'doc':
      return 'application/msword'
    case 'xls':
      return 'application/vnd.ms-excel'
    case 'ppt':
      return 'application/vnd.ms-powerpoint'
    case 'msi':
      return 'application/x-msdownload'
    default:
      return defaultMimeType
  }
}
