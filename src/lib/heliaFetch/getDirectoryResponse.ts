/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import type { UnixFS, UnixFSStats } from '@helia/unixfs'
import type { CID, Version } from 'multiformats'
import pTryEach from 'p-try-each'
import type { Helia } from '@helia/interface'

import type { UnixFSEntry } from 'ipfs-unixfs-exporter'
import { getFileResponse } from './getFileResponse.ts'
import dirListStyle from './dirListStyle.ts'

/**
 * Stolen from https://github.com/ipfs/js-ipfs/blob/master/packages/ipfs-http-response/src/resolver.js
 */
const INDEX_HTML_FILES = [
  'index.html',
  'index.htm',
  'index.shtml'
]

const findIndexFile = async (heliaFs: UnixFS, cid: CID, path: string): Promise<UnixFSStats> => {
  return await pTryEach(INDEX_HTML_FILES.map(file => {
    return async () => {
      const stats = await heliaFs.stat(cid, { path: `${path}/${file}` })

      return {
        name: file,
        cid: stats.cid
      }
    }
  }))
}

// /**
//  * @param {UnixFS} heliaFs
//  * @param {string} path
//  * @param {CID} cid
//  */
// export const directory = async (heliaFs, path, cid): Promise<unknown> => {
//   // Test if it is a Website
//   try {
//     const res = await findIndexFile(heliaFs, cid, cid.toString())

//     return [{ Name: res.name }]
//   } catch (/** @type {any} */ err) {
//     // if (err.message.includes('does not exist')) {
//     //   // not a website, just show a directory listing
//     //   const result = await ipfs.dag.get(cid)

//     //   return render(path, result.value.Links)
//     // }
//     console.log('not supported: ', err)

//     throw err
//   }
// }

export interface GetDirectoryResponseOptions {
  cid: CID<unknown, number, number, Version>
  fs: UnixFS
  helia: Helia
  signal?: AbortSignal
  headers?: Headers
  path?: string
}

// updated version of https://github.com/ipfs/js-ipfs/blob/b64d4af034f27aa7204e57e6a79f95461095502c/packages/ipfs-http-response/src/dir-view/index.js#L22

function getEntryItemHtml (entry: UnixFSEntry, path): string {
  const link = `${path}${path.endsWith('/') ? '' : '/'}${entry.name}`
  return `<tr>
  <td><div class="ipfs-icon ipfs-_blank">&nbsp;</div></td>
  <td><a href="/${link}">${entry.name}</a></td>
  <td>${entry.size}</td>
</tr>`
}

// <% links.forEach(function (link) { %>
// <tr>
//   <td><div class="ipfs-icon ipfs-_blank">&nbsp;</div></td>
//   <td><a href="${link.link}"><%= link.name %></a></td>
//   <td><%= link.size %></td>
// </tr>
// <% }) %>

function getIndexListingResponse (path: string, entries: UnixFSEntry[]): Response {
  const style = dirListStyle // todo: add styles from https://github.com/ipfs/js-ipfs/blob/master/packages/ipfs-http-response/src/dir-view/style.js
  const parentHref = path.split('/').slice(0, -1).join('/') || '/'

  // todo: use the latest directory listing template from https://github.com/ipfs/boxo/blob/main/gateway/assets/src/directory-index.html
  const body = '' +
`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${path}</title>
  <style>${style}</style>
</head>
<body>
  <div id="header" class="row">
    <div class="col-xs-2">
      <div id="logo" class="ipfs-logo"></div>
    </div>
  </div>
  <br>
  <div class="col-xs-12">
    <div class="panel panel-default">
      <div class="panel-heading">
        <strong>Index of ${path}</strong>
      </div>
      <table class="table table-striped">
        <tbody>
          <tr>
            <td class="narrow">
              <div class="ipfs-icon ipfs-_blank">&nbsp;</div>
            </td>
            <td class="padding">
              <a href="/helia-sw/${parentHref}">..</a>
            </td>
            <td></td>
          </tr>
          ${entries.map((entry) => getEntryItemHtml(entry, `helia-sw/${path}`)).join('')}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`

  return new Response(body, {
    status: 200,
    headers: {
      'Cache-Control': 'public, max-age=29030400, immutable', // same as ipfs.io gateway
      'Content-Type': 'text/html; charset=utf-8'
    }
  })
}

export async function getDirectoryResponse ({ cid, fs, helia, signal, headers, path = '' }: GetDirectoryResponseOptions): Promise<Response> {
  try {
    const indexFile = await findIndexFile(fs, cid, path)
    console.log('getDirectoryResponse indexFile: ', indexFile)

    const response = await getFileResponse({ cid: indexFile.cid, path, fs, helia, signal, headers })
    response.headers.set('Content-Type', 'text/html; charset=utf-8')
    const bodyText = await response.text()

    return new Response(bodyText, response)
  } catch (err) {
    // console.error('getDirectoryResponse Error finding index file', err)
    const entries: UnixFSEntry[] = []
    try {
      for await (const entry of fs.ls(cid, { signal, path })) {
        entries.push(entry)
      }
    } catch (e) {
      console.error('fs.ls error: ', e)
    }

    return getIndexListingResponse(`${cid}/${path}`, entries)
  }
}
