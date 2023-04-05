import type { Helia } from '@helia/interface'
import { unixfs } from '@helia/unixfs'
import { CID } from 'multiformats/cid'

import { getDirectoryResponse } from './heliaFetch/getDirectoryResponse.ts'
import { getFileResponse } from './heliaFetch/getFileResponse.ts'
import { GetDNSLinkOrIPNS } from '../kubo-rpc-ipns.ts'

export interface HeliaFetchOptions {
  path: string
  helia: Helia
  signal?: AbortSignal
  headers?: Headers
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
 * * TODO: implement as much of the gateway spec as possible.
 * * TODO: why we would be better than ipfs.io/other-gateway
 * * TODO: have error handling that renders 404/500/other if the request is bad.
 *
 * @param event
 * @returns
 */
export async function heliaFetch ({ path, helia, signal, headers }: HeliaFetchOptions): Promise<Response> {
  const pathWithoutHeliaSWPrefix = path.replace(/^\/helia-sw\//, '')
  const pathParts = pathWithoutHeliaSWPrefix.split('/')
  const namespaceString = pathParts[0]
  const pathRootString = pathParts[1]
  const contentPath = pathParts.slice(2).join('/')

  if (namespaceString !== 'ipfs' && namespaceString !== 'ipns') {
    throw new Error(`only /ipfs or /ipns namespaces supported got ${namespaceString}`)
  }

  let rootCidString: string
  if (namespaceString === 'ipns') {
    const newPathRoot = await GetDNSLinkOrIPNS(pathRootString)
    const newPathParts = newPathRoot.split('/')
    // TODO: better parsing, surely this code already exists
    // TODO: deal with recursive resolution
    if ((newPathParts[0] !== '' || newPathParts[1] !== 'ipfs') || newPathParts.length !== 3) {
      throw new Error('only non-recursive IPNS/DNSLink supported and must point to /ipfs/<CID>')
    }
    rootCidString = newPathParts[2]
  } else {
    rootCidString = pathRootString
  }

  // console.log('cidString: ', cidString)
  // console.log('cidString: ', cidString)
  // const helia = await getHelia({ libp2pConfigType: 'ipni' })

  // const etag = cidString
  // const cachedEtag = headers?.['if-none-match']
  // if (cachedEtag === etag || cachedEtag === `W/${etag}`) {
  //   return new Response(undefined, { status: 304 }) // Not Modified
  // }
  const fs = unixfs(helia)
  const cid = CID.parse(rootCidString)

  try {
    const fsStatInfo = await fs.stat(cid, { signal, path: '/' + contentPath })
    switch (fsStatInfo.type) {
      case 'directory':
        return await getDirectoryResponse({ cid, fs, helia, signal, headers, path: contentPath })
      case 'raw':
      case 'file':
        return await getFileResponse({ cid, fs, helia, signal, headers, path: contentPath })
      default:
        throw new Error(`Unsupported fsStatInfo.type: ${fsStatInfo.type}`)
    }
  } catch (e) {
    console.error('fs.stat error: ', e)
  }
  return new Response('Not Found', { status: 404 })
}
