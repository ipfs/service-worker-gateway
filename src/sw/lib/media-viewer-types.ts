/**
 * Helpers for the media-viewer wrapper page. Workaround for the Chromium SW
 * "Save As" bug — see https://github.com/ipfs/service-worker-gateway/issues/574
 * and https://issues.chromium.org/issues/400455011.
 *
 * `getMediaTypeInfo` returns kind + extension for content types we wrap, or
 * `undefined` to fall through. `deriveViewerNames` produces both the top-bar
 * label and the download filename in one pass.
 */

export type MediaKind = 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'json'

export interface MediaTypeInfo {
  kind: MediaKind
  extension: string
}

const EXACT: Record<string, MediaTypeInfo> = {
  'application/pdf': { kind: 'pdf', extension: 'pdf' },
  'application/json': { kind: 'json', extension: 'json' },
  'text/plain': { kind: 'text', extension: 'txt' },
  'image/jpeg': { kind: 'image', extension: 'jpg' },
  'image/png': { kind: 'image', extension: 'png' },
  'image/gif': { kind: 'image', extension: 'gif' },
  'image/webp': { kind: 'image', extension: 'webp' },
  'image/svg+xml': { kind: 'image', extension: 'svg' },
  'image/avif': { kind: 'image', extension: 'avif' },
  'video/mp4': { kind: 'video', extension: 'mp4' },
  'video/webm': { kind: 'video', extension: 'webm' },
  'audio/mpeg': { kind: 'audio', extension: 'mp3' },
  'audio/ogg': { kind: 'audio', extension: 'ogg' },
  'audio/wav': { kind: 'audio', extension: 'wav' }
}

export function getMediaTypeInfo (contentType: string | null): MediaTypeInfo | undefined {
  if (contentType == null) {
    return undefined
  }

  const base = contentType.split(';')[0].trim().toLowerCase()

  if (EXACT[base] != null) {
    return EXACT[base]
  }

  // family fallback: wrap unknown image/video/audio subtypes too
  const [family, sub] = base.split('/')

  if (family === 'image' || family === 'video' || family === 'audio') {
    return { kind: family, extension: sub ?? family }
  }

  return undefined
}

export interface ViewerNames {
  /**
   * User-facing label for the top bar and page title. Mirrors what the URL
   * contains (or the bare CID for `/ipfs/cid` requests); never invents an
   * extension.
   */
  displayName: string

  /**
   * Filename passed to the browser via the `?filename=` query param, which
   * verified-fetch then writes into `Content-Disposition`. Always carries an
   * extension so the OS opens the saved file with the right application.
   */
  filename: string
}

/**
 * Derive the top-bar label and the download filename from the IPFS path.
 *
 * Order of preference:
 *
 * 1. Last path segment if it already has an extension
 * (e.g. `/ipfs/cid/path/foo.png` → both = `foo.png`)
 * 2. Last path segment as-is when it exists but has no extension
 * (e.g. `/ipfs/cid/readme` for `text/plain` → display = `readme`,
 * filename = `readme.txt`)
 * 3. Bare CID for `/ipfs/cid` or subdomain root
 * (display = `cid`, filename = `cid.<ext>` — same shape as `dweb.link` and
 * `ipfs.io` use)
 */
export function deriveViewerNames (ipfsPath: string, cid: string, info: MediaTypeInfo): ViewerNames {
  const segments = ipfsPath.split('/').filter(Boolean)
  const last = segments[segments.length - 1]
  const isJustCid = last == null || last === cid

  if (!isJustCid) {
    if (/\.[A-Za-z0-9]{1,8}$/.test(last)) {
      return { displayName: last, filename: last }
    }

    return { displayName: last, filename: `${last}.${info.extension}` }
  }

  return { displayName: cid, filename: `${cid}.${info.extension}` }
}
