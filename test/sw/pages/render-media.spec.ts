import { expect } from 'aegir/chai'
import { CID } from 'multiformats/cid'
import { renderMediaViewerPageResponse } from '../../../src/sw/pages/render-media.ts'
import type { ContentURI } from '../../../src/lib/parse-request.ts'
import type { MediaTypeInfo } from '../../../src/sw/lib/media-viewer-types.ts'

function makeRequest (cidStr: string, urlPath = '/'): ContentURI {
  return {
    protocol: 'ipfs',
    type: 'subdomain',
    cid: CID.parse(cidStr),
    subdomainURL: new URL(`http://${cidStr}.ipfs.localhost:3000${urlPath}`),
    pathURL: new URL(`http://localhost:3000/ipfs/${cidStr}${urlPath}`),
    nativeURL: new URL(`ipfs://${cidStr}${urlPath}`)
  }
}

function titleOf (html: string): string | undefined {
  return /<title>([^<]*)<\/title>/.exec(html)?.[1]
}

describe('/sw/pages/render-media', () => {
  describe('media viewer title', () => {
    it('uses just the filename for a deep image path', async () => {
      const cid = 'bafybeiaysi4s6lnjev27ln5icwm6tueaw2vdykrtjkwiphwekaywqhcjze'
      const filename = 'Asia_(orthographic_projection).svg.png.webp'
      const urlPath = `/I/${filename}`
      const info: MediaTypeInfo = { kind: 'image', extension: 'webp' }
      const response = new Response(null, {
        headers: {
          'content-type': 'image/webp',
          'x-ipfs-roots': cid,
          'x-ipfs-path': `/ipfs/${cid}${urlPath}`
        }
      })

      const result = renderMediaViewerPageResponse(makeRequest(cid, urlPath), response, info)
      const html = await result.text()

      expect(titleOf(html)).to.equal(filename)
    })
  })
})
