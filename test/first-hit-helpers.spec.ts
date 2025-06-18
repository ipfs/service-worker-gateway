/* eslint-env mocha */
import { expect } from 'aegir/chai'
import { getHeliaSwRedirectUrl, getIsolatedOriginRedirectUrl } from '../src/lib/first-hit-helpers.js'

function expectRedirect ({ from, to }: { from: string, to: string }): void {
  const fromURL = new URL(from)
  const toURL = new URL(to)

  const newURL = getHeliaSwRedirectUrl(fromURL, toURL)

  // for each query param in the toURL, check that the newURL has the same value
  toURL.searchParams.forEach((value, key) => {
    expect(newURL.searchParams.get(key)).to.equal(value)
  })

  // check that the newURL has the same hash as the toURL
  expect(newURL.hash).to.equal(toURL.hash)

  // check that the newURL has the same origin as the toURL
  expect(newURL.origin).to.equal(toURL.origin)

  // check that the newURL has the same pathname as the toURL
  expect(newURL.pathname).to.equal(toURL.pathname)
}

describe('first-hit-helpers', () => {
  describe('getHeliaSwRedirectUrl', () => {
    it('should bounce to ?helia-sw=<path> url', () => {
      expectRedirect({
        from: 'http://localhost:3334/ipfs/bafkqablimvwgy3y',
        to: `http://localhost:3334/?helia-sw=${encodeURIComponent('/ipfs/bafkqablimvwgy3y')}`
      })
    })

    it('should bounce to ?helia-sw=<path> url with extra query params', () => {
      expectRedirect({
        from: 'http://localhost:3334/ipfs/bafkqablimvwgy3y?foo=bar',
        to: `http://localhost:3334/?helia-sw=${encodeURIComponent('/ipfs/bafkqablimvwgy3y')}&foo=bar`
      })
    })

    it('should handle origin isolation redirect hash', () => {
      expectRedirect({
        from: 'http://localhost:3334/ipfs/bafkqablimvwgy3y#/ipfs-sw-origin-isolation-warning',
        to: `http://localhost:3334/?helia-sw=${encodeURIComponent('/ipfs/bafkqablimvwgy3y')}#/ipfs-sw-origin-isolation-warning`
      })
    })

    it('should handle deep path requests properly', () => {
      expectRedirect({
        from: 'http://localhost:3333/ipfs/bafybeigccimv3zqm5g4jt363faybagywkvqbrismoquogimy7kvz2sj7sq/1 - Barrel - Part 1 - alt.txt',
        to: `http://localhost:3333/?helia-sw=${encodeURIComponent('/ipfs/bafybeigccimv3zqm5g4jt363faybagywkvqbrismoquogimy7kvz2sj7sq/1 - Barrel - Part 1 - alt.txt')}`
      })
    })

    it('should handle subdomain requests properly', () => {
      expectRedirect({
        from: 'http://bafybeigccimv3zqm5g4jt363faybagywkvqbrismoquogimy7kvz2sj7sq.ipfs.localhost:3333/1 - Barrel - Part 1 - alt.txt',
        to: `http://bafybeigccimv3zqm5g4jt363faybagywkvqbrismoquogimy7kvz2sj7sq.ipfs.localhost:3333/?helia-sw=${encodeURIComponent('/1 - Barrel - Part 1 - alt.txt')}`
      })
    })
  })

  describe('getIsolatedOriginRedirectUrl', () => {
    it('returns the original URL if helia-sw is missing', () => {
      const url = new URL('https://example.com/path?foo=bar#baz')
      const out = getIsolatedOriginRedirectUrl(new URL(url.toString()))
      expect(out.toString()).to.equal(url.toString())
    })

    it('handles a basic ipfs redirect with no extra path', () => {
      const url = new URL('http://localhost:3334/?helia-sw=/ipfs/bafkqablimvwgy3y')
      const out = getIsolatedOriginRedirectUrl(new URL(url.toString()))
      expect(out.toString()).to.equal('http://bafkqablimvwgy3y.ipfs.localhost:3334/')
    })

    it('preserves additional search params besides helia-sw', () => {
      const url = new URL('http://localhost:3334/?helia-sw=/ipfs/bafkqablimvwgy3y/abc&foo=bar')
      const out = getIsolatedOriginRedirectUrl(new URL(url.toString()))
      expect(out.searchParams.get('foo')).to.equal('bar')
      // helia-sw should be removed
      expect(out.searchParams.has('helia-sw')).to.be.false()
      expect(out.pathname).to.equal('/abc')
    })

    it('preserves hash fragments', () => {
      const url = new URL('https://dweb.link/?helia-sw=/ipfs/QmCid/some/path#frag')
      const out = getIsolatedOriginRedirectUrl(new URL(url.toString()))
      expect(out.hash).to.equal('#frag')
    })

    it('handles deeper paths correctly', () => {
      const url = new URL('https://site.test/?helia-sw=/ipfs/bafkqablimvwgy3y/deep/nested/file.txt')
      const out = getIsolatedOriginRedirectUrl(new URL(url.toString()))
      expect(out.host).to.equal('bafkqablimvwgy3y.ipfs.site.test')
      expect(out.pathname).to.equal('/deep/nested/file.txt')
    })

    it('works for ipns protocol as well', () => {
      const url = new URL('https://gateway/?helia-sw=/ipns/example.com/blog')
      const out = getIsolatedOriginRedirectUrl(new URL(url.toString()))
      expect(out.host).to.equal('example.com.ipns.gateway')
      expect(out.pathname).to.equal('/blog')
    })

    it('defaults to "/" when no path segment is provided', () => {
      const url = new URL('http://localhost:3334/?helia-sw=/ipfs/bafkqablimvwgy3y')
      const out = getIsolatedOriginRedirectUrl(new URL(url.toString()))
      expect(out.pathname).to.equal('/')
    })

    it('leaves malformed helia-sw values unchanged', () => {
      const url = new URL('http://localhost:3334/?helia-sw=not/a/valid/format')
      expect(() => getIsolatedOriginRedirectUrl(new URL(url.toString()))).to.throw('Invalid helia-sw value: not/a/valid/format')
    })
  })
})
