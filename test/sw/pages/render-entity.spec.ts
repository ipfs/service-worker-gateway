import { MEDIA_TYPE_DAG_CBOR, MEDIA_TYPE_DAG_PB } from '@helia/verified-fetch'
import { expect } from 'aegir/chai'
import { CID } from 'multiformats/cid'
import { renderEntityPageResponse } from '../../../src/sw/pages/render-entity.ts'
import type { ContentURI } from '../../../src/lib/parse-request.ts'

// Inlined empty UnixFS directory (dag-pb + identity multihash).
const DIR_CID = 'bafyaabakaieac'
// Inlined empty raw block (raw + identity multihash) - stands in for any
// non-directory entity preview.
const RAW_CID = 'bafkqaaa'
// Empty dag-cbor block (dag-cbor + sha-256).
const DAG_CBOR_CID = 'bafyreigbtj4x7ip5legnfznufuopl4sg4knzc2cof6duas4b3q2fy6swua'

function makeRequest (cidStr: string): ContentURI {
  return {
    protocol: 'ipfs',
    type: 'subdomain',
    cid: CID.parse(cidStr),
    subdomainURL: new URL(`http://${cidStr}.ipfs.localhost:3000/`),
    pathURL: new URL(`http://localhost:3000/ipfs/${cidStr}/`),
    nativeURL: new URL(`ipfs://${cidStr}/`)
  }
}

function titleOf (html: string): string | undefined {
  return /<title>([^<]*)<\/title>/.exec(html)?.[1]
}

describe('/sw/pages/render-entity', () => {
  describe('directory listing title', () => {
    it('uses the ipfs path as title for UnixFS directories', async () => {
      const ipfsPath = '/ipns/dist.ipfs.tech/kubo/'
      const response = new Response(null, {
        headers: {
          'content-type': MEDIA_TYPE_DAG_PB,
          'x-ipfs-roots': DIR_CID,
          'x-ipfs-path': ipfsPath
        }
      })

      const result = renderEntityPageResponse(makeRequest(DIR_CID), new Headers(), response, new ArrayBuffer(0))
      const html = await result.text()

      expect(titleOf(html)).to.equal(ipfsPath)
    })

    it('falls back to the CID when the directory has no x-ipfs-path header', async () => {
      const response = new Response(null, {
        headers: {
          'content-type': MEDIA_TYPE_DAG_PB,
          'x-ipfs-roots': DIR_CID
        }
      })

      const result = renderEntityPageResponse(makeRequest(DIR_CID), new Headers(), response, new ArrayBuffer(0))
      const html = await result.text()

      expect(titleOf(html)).to.equal(DIR_CID)
    })

    it('decodes percent-encoded path segments', async () => {
      const response = new Response(null, {
        headers: {
          'content-type': MEDIA_TYPE_DAG_PB,
          'x-ipfs-roots': DIR_CID,
          'x-ipfs-path': '/ipfs/bafy.../hello%20world/'
        }
      })

      const result = renderEntityPageResponse(makeRequest(DIR_CID), new Headers(), response, new ArrayBuffer(0))
      const html = await result.text()

      expect(titleOf(html)).to.equal('/ipfs/bafy.../hello world/')
    })

    it('HTML-escapes path segments so they cannot break out of <title>', async () => {
      const response = new Response(null, {
        headers: {
          'content-type': MEDIA_TYPE_DAG_PB,
          'x-ipfs-roots': DIR_CID,
          'x-ipfs-path': '/ipfs/bafy.../</title><script>x</script>/'
        }
      })

      const result = renderEntityPageResponse(makeRequest(DIR_CID), new Headers(), response, new ArrayBuffer(0))
      const html = await result.text()

      expect(html).to.not.include('<script>x</script>')
      expect(titleOf(html)).to.equal('/ipfs/bafy.../&lt;/title&gt;&lt;script&gt;x&lt;/script&gt;/')
    })
  })

  describe('non-directory entity title', () => {
    it('uses the CID for raw previews even when x-ipfs-path is set', async () => {
      const response = new Response(null, {
        headers: {
          'content-type': 'application/vnd.ipld.raw',
          'x-ipfs-roots': RAW_CID,
          'x-ipfs-path': `/ipfs/${RAW_CID}`
        }
      })

      const result = renderEntityPageResponse(makeRequest(RAW_CID), new Headers(), response, new ArrayBuffer(0))
      const html = await result.text()

      expect(titleOf(html)).to.equal(RAW_CID)
    })

    it('uses the CID for dag-cbor previews even when x-ipfs-path is set', async () => {
      const response = new Response(null, {
        headers: {
          'content-type': MEDIA_TYPE_DAG_CBOR,
          'x-ipfs-roots': DAG_CBOR_CID,
          'x-ipfs-path': `/ipfs/${DAG_CBOR_CID}`
        }
      })

      const result = renderEntityPageResponse(makeRequest(DAG_CBOR_CID), new Headers(), response, new ArrayBuffer(0))
      const html = await result.text()

      expect(titleOf(html)).to.equal(DAG_CBOR_CID)
    })
  })
})
