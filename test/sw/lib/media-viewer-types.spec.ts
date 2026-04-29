import { expect } from 'aegir/chai'
import { deriveViewerNames, getMediaTypeInfo } from '../../../src/sw/lib/media-viewer-types.ts'

describe('/sw/lib/media-viewer-types', () => {
  describe('getMediaTypeInfo', () => {
    it('returns exact-match info for known content types', () => {
      expect(getMediaTypeInfo('image/png')).to.deep.equal({ kind: 'image', extension: 'png' })
      expect(getMediaTypeInfo('image/jpeg')).to.deep.equal({ kind: 'image', extension: 'jpg' })
      expect(getMediaTypeInfo('application/pdf')).to.deep.equal({ kind: 'pdf', extension: 'pdf' })
      expect(getMediaTypeInfo('application/json')).to.deep.equal({ kind: 'json', extension: 'json' })
      expect(getMediaTypeInfo('text/plain')).to.deep.equal({ kind: 'text', extension: 'txt' })
      expect(getMediaTypeInfo('audio/mpeg')).to.deep.equal({ kind: 'audio', extension: 'mp3' })
    })

    it('strips media-type parameters before matching', () => {
      expect(getMediaTypeInfo('application/json; charset=utf-8')).to.deep.equal({ kind: 'json', extension: 'json' })
      expect(getMediaTypeInfo('text/plain;charset=UTF-8')).to.deep.equal({ kind: 'text', extension: 'txt' })
      expect(getMediaTypeInfo('image/svg+xml; q=0.9')).to.deep.equal({ kind: 'image', extension: 'svg' })
    })

    it('is case-insensitive on the type', () => {
      expect(getMediaTypeInfo('IMAGE/PNG')).to.deep.equal({ kind: 'image', extension: 'png' })
      expect(getMediaTypeInfo('Application/JSON')).to.deep.equal({ kind: 'json', extension: 'json' })
    })

    it('falls back to family + subtype for unknown image/video/audio subtypes', () => {
      expect(getMediaTypeInfo('image/foobar')).to.deep.equal({ kind: 'image', extension: 'foobar' })
      expect(getMediaTypeInfo('video/quirky')).to.deep.equal({ kind: 'video', extension: 'quirky' })
      expect(getMediaTypeInfo('audio/something-new')).to.deep.equal({ kind: 'audio', extension: 'something-new' })
    })

    it('returns undefined for non-renderable types so the caller falls through', () => {
      expect(getMediaTypeInfo('text/html')).to.equal(undefined)
      expect(getMediaTypeInfo('text/css')).to.equal(undefined)
      expect(getMediaTypeInfo('application/javascript')).to.equal(undefined)
      expect(getMediaTypeInfo('application/octet-stream')).to.equal(undefined)
    })

    it('returns undefined for null or empty input', () => {
      expect(getMediaTypeInfo(null)).to.equal(undefined)
      expect(getMediaTypeInfo('')).to.equal(undefined)
    })
  })

  describe('deriveViewerNames', () => {
    const cid = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
    const png = { kind: 'image' as const, extension: 'png' }
    const txt = { kind: 'text' as const, extension: 'txt' }

    it('uses bare CID + extension for /ipfs/cid', () => {
      expect(deriveViewerNames(`/ipfs/${cid}`, cid, png)).to.deep.equal({
        displayName: cid,
        filename: `${cid}.png`
      })
    })

    it('keeps the path tail when it already has an extension', () => {
      expect(deriveViewerNames(`/ipfs/${cid}/foo.png`, cid, png)).to.deep.equal({
        displayName: 'foo.png',
        filename: 'foo.png'
      })
    })

    it('keeps multi-dot extensions like .tar.gz unchanged', () => {
      expect(deriveViewerNames(`/ipfs/${cid}/My.File.tar.gz`, cid, png)).to.deep.equal({
        displayName: 'My.File.tar.gz',
        filename: 'My.File.tar.gz'
      })
    })

    it('keeps an already-correct extension without duplicating', () => {
      const webp = { kind: 'image' as const, extension: 'webp' }
      const path = `/ipfs/${cid}/I/page1-330px-Political_Map_of_the_Arctic.pdf.jpg.webp`
      expect(deriveViewerNames(path, cid, webp)).to.deep.equal({
        displayName: 'page1-330px-Political_Map_of_the_Arctic.pdf.jpg.webp',
        filename: 'page1-330px-Political_Map_of_the_Arctic.pdf.jpg.webp'
      })
    })

    it('appends content-type extension when the path tail has none', () => {
      expect(deriveViewerNames(`/ipfs/${cid}/readme`, cid, txt)).to.deep.equal({
        displayName: 'readme',
        filename: 'readme.txt'
      })
    })

    it('treats a trailing slash as no tail and uses the segment before it', () => {
      expect(deriveViewerNames(`/ipfs/${cid}/folder/`, cid, png)).to.deep.equal({
        displayName: 'folder',
        filename: 'folder.png'
      })
    })

    it('falls back to the bare-CID name when the last segment equals the CID', () => {
      expect(deriveViewerNames(`/ipfs/${cid}`, cid, png).displayName).to.equal(cid)
      expect(deriveViewerNames(`/ipfs/${cid}/`, cid, png).displayName).to.equal(cid)
    })

    it('falls back to the bare-CID name when the path is empty', () => {
      expect(deriveViewerNames('', cid, png)).to.deep.equal({
        displayName: cid,
        filename: `${cid}.png`
      })
    })
  })
})
