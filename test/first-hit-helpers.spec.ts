/* eslint-env mocha */
import { expect } from 'aegir/chai'
import { getHeliaSwRedirectUrl } from '../src/lib/first-hit-helpers.js'

describe('first-hit-helpers', () => {
  describe('getHeliaSwRedirectUrl', () => {
    it('should return the correct URL', () => {
      const url = getHeliaSwRedirectUrl('https://localhost:3334/ipfs/bafkqablimvwgy3y?query=1#hash')
      expect(url.toString()).to.equal(`https://localhost:3334/?helia-sw=${encodeURIComponent('/ipfs/bafkqablimvwgy3y?query=1#hash')}`)
    })

    it('should return the correct URL with a subdomain', () => {
      const url = getHeliaSwRedirectUrl('https://bafkqablimvwgy3y.ipfs.localhost:3334/someFile.txt?query=1#hash')
      expect(url.toString()).to.equal(`https://bafkqablimvwgy3y.ipfs.localhost:3334/?helia-sw=${encodeURIComponent('/someFile.txt?query=1#hash')}`)
    })

    it('should not add the helia-sw parameter if it already exists', () => {
      const url = getHeliaSwRedirectUrl(`https://localhost:3334/?helia-sw=${encodeURIComponent('/ipfs/bafkqablimvwgy3y?query=1#hash')}`)
      expect(url.toString()).to.equal(`https://localhost:3334/?helia-sw=${encodeURIComponent('/ipfs/bafkqablimvwgy3y?query=1#hash')}`)
    })

    it('should handle existing helia-sw query param with non-encoded hash', () => {
      const url = getHeliaSwRedirectUrl(`http://127.0.0.1:3334/?helia-sw=${encodeURIComponent('/ipfs/bafkqablimvwgy3y?foo=bar#hash')}#/ipfs-sw-origin-isolation-warning`)
      expect(url.toString()).to.equal(`http://127.0.0.1:3334/?helia-sw=${encodeURIComponent('/ipfs/bafkqablimvwgy3y?foo=bar#hash')}#/ipfs-sw-origin-isolation-warning`)
    })
  })
})
