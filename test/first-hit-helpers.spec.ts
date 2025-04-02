/* eslint-env mocha */
import { expect } from 'aegir/chai'
import { getHeliaSwRedirectUrl } from '../src/lib/first-hit-helpers.js'

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
})
