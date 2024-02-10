import { createVerifiedFetch, type ContentTypeParser } from '@helia/verified-fetch'
import { fileTypeFromBuffer } from '@sgtpooki/file-type'
import type { Helia } from '@helia/interface'

export interface HeliaFetchOptions {
  path: string
  helia: Helia
  signal?: AbortSignal
  headers?: Headers
}

// default from verified-fetch is application/octect-stream, which forces a download. This is not what we want for MANY file types.
const defaultMimeType = 'text/html; charset=utf-8'
const contentTypeParser: ContentTypeParser = async (bytes, fileName) => {
  // eslint-disable-next-line no-console
  console.log('bytes received in contentTypeParser for ', fileName, ' : ', bytes.slice(0, 10), '...')

  const detectedType = (await fileTypeFromBuffer(bytes))?.mime
  if (detectedType != null) {
    return detectedType
  }
  if (fileName == null) {
    // no other way to determine file-type.
    return defaultMimeType
  }

  // no need to include file-types listed at https://github.com/SgtPooki/file-type#supported-file-types
  switch (fileName.split('.').pop()) {
    case 'css':
      return 'text/css'
    case 'html':
      return 'text/html; charset=utf-8'
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

// Check for **/*.css/fonts/**/*.ttf urls */
const cssPathRegex = /(?<cssPath>.*\.css)(?<fontPath>[^.]*\.ttf)/

/**
 * Maps relative paths to font-faces from css files to the correct path from the root.
 *
 * e.g. in a css file (like specs.ipfs.tech's /ipns/specs.ipfs.tech/css/ipseity.min.css), you will find lines like:
 * ```
 * @font-face {
 *   font-family: 'Plex';
 *   font-style:  normal;
 *   font-weight: 100;
 *   src: local('IBM Plex Sans'),
 *     local('IBM-Plex-Sans'),
 *     url('/fonts/IBMPlexSans-Thin.ttf') format('opentype');
 * }
 * ```
 * which results in a request to `/ipns/specs.ipfs.tech/css/ipseity.min.css/fonts/IBMPlexSans-Thin.ttf`. Instead,
 * we want to request `/ipns/specs.ipfs.tech/fonts/IBMPlexSans-Thin.ttf`.
 */
function changeCssFontPath (path: string): string {
  const match = path.match(cssPathRegex)
  if (match == null) {
    return path
  }
  const { cssPath, fontPath } = match.groups as { cssPath?: string, fontPath?: string }
  if (cssPath == null || fontPath == null) {
    return path
  }
  // eslint-disable-next-line no-console
  // console.log(`changeCssFontPath: Changing font path from ${path} to ${fontPath}`)
  return fontPath
}

/**
 * Test files:
 * bafkreienxxjqg3jomg5b75k7547dgf7qlbd3qpxy2kbg537ck3rol4mcve  - text            - https://bafkreienxxjqg3jomg5b75k7547dgf7qlbd3qpxy2kbg537ck3rol4mcve.ipfs.w3s.link/?filename=test.txt
 * bafkreicafxt3zr4cshf7qteztjzl62ouxqrofu647e44wt7s2iaqjn7bra  - image/jpeg      - http://127.0.0.1:8080/ipfs/bafkreicafxt3zr4cshf7qteztjzl62ouxqrofu647e44wt7s2iaqjn7bra?filename=bafkreicafxt3zr4cshf7qteztjzl62ouxqrofu647e44wt7s2iaqjn7bra
 * broken -  QmY7fzZEpgDUqZ7BEePSS5JxxezDj3Zy36EEpWSmKmv5mo               - image/jpeg      - http://127.0.0.1:8080/ipfs/QmY7fzZEpgDUqZ7BEePSS5JxxezDj3Zy36EEpWSmKmv5mo?filename=QmY7fzZEpgDUqZ7BEePSS5JxxezDj3Zy36EEpWSmKmv5mo
 * web3_storageLogo.svg - bafkreif4ufrfpfcmqn5ltjvmeisgv4k7ykqz2mjygpngtwt4bijxosidqa  - image/svg+xml   - https://bafkreif4ufrfpfcmqn5ltjvmeisgv4k7ykqz2mjygpngtwt4bijxosidqa.ipfs.dweb.link/?filename=Web3.Storage-logo.svg
 * broken - bafybeiekildl23opzqcsufewlbadhbabs6pyqg35tzpfavgtjyhchyikxa  - video/quicktime - https://bafybeiekildl23opzqcsufewlbadhbabs6pyqg35tzpfavgtjyhchyikxa.ipfs.dweb.link
 * stock_skateboarder.webm - bafkreiezuss4xkt5gu256vjccx7vocoksxk77vwmdrpwoumfbbxcy2zowq  - video/webm (147.78 KiB)    - https://bafkreiezuss4xkt5gu256vjccx7vocoksxk77vwmdrpwoumfbbxcy2zowq.ipfs.dweb.link
 * bafybeierkpfmf4vhtdiujgahfptiyriykoetxf3rmd3vcxsdemincpjoyu  - video/mp4 (2.80 MiB)    - https://bafybeierkpfmf4vhtdiujgahfptiyriykoetxf3rmd3vcxsdemincpjoyu.ipfs.dweb.link
 * bugbunny.mov - bafybeidsp6fva53dexzjycntiucts57ftecajcn5omzfgjx57pqfy3kwbq  - video/mp4 (2.80 MiB)  - https://bafybeieekpb73vggby3m35mnpre3pngdcdnnu47u25ehsz4r3xbmqum6nu.ipfs.w3s.link/ipfs/bafybeidsp6fva53dexzjycntiucts57ftecajcn5omzfgjx57pqfy3kwbq?filename=BugBunny.mov
 * ipfs.tech website - QmeUdoMyahuQUPHS2odrZEL6yk2HnNfBJ147BeLXsZuqLJ  - text/html - https://QmeUdoMyahuQUPHS2odrZEL6yk2HnNfBJ147BeLXsZuqLJ.ipfs.w3s.link
 */

/**
 * heliaFetch should have zero awareness of whether it's being used inside a service worker or not.
 *
 * The `path` supplied should be either:
 * * /ipfs/CID
 * * /ipns/DNSLink
 * * /ipns/key
 *
 * Things to do:
 * * TODO: implement as much of the gateway spec as possible.
 * * TODO: why we would be better than ipfs.io/other-gateway
 * * TODO: have error handling that renders 404/500/other if the request is bad.
 *
 */
export async function heliaFetch ({ path, helia, signal, headers }: HeliaFetchOptions): Promise<Response> {
  const pathParts = path.split('/')

  let pathPartIndex = 0
  let namespaceString = pathParts[pathPartIndex++]
  if (namespaceString === '') {
    // we have a prefixed '/' in the path, use the new index instead
    namespaceString = pathParts[pathPartIndex++]
  }
  const pathRootString = pathParts[pathPartIndex++]
  const contentPath = pathParts.slice(pathPartIndex++).join('/')

  if (namespaceString !== 'ipfs' && namespaceString !== 'ipns') {
    throw new Error(`only /ipfs or /ipns namespaces supported got ${namespaceString}`)
  }

  const verifiedFetch = await createVerifiedFetch(helia, {
    contentTypeParser
  })

  return verifiedFetch(`${namespaceString}://${pathRootString}/${changeCssFontPath(contentPath)}`, {
    signal,
    headers,
    onProgress: (e) => {
      // eslint-disable-next-line no-console
      console.log(`${e.type}: `, e.detail)
    }
  })
}
