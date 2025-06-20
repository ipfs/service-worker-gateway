/* eslint-env mocha */
import { expect } from 'aegir/chai'
import { isBrowser } from 'wherearewe'
import { QUERY_PARAMS } from '../src/lib/constants.js'
import { getHeliaSwRedirectUrl, getConfigRedirectUrl, getUrlWithConfig } from '../src/lib/first-hit-helpers.js'

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

  describe('getConfigRedirectUrl', () => {
    it('should return null for non-isolated origin', async () => {
      const url = new URL('https://example.com/foo')
      const state = {
        url,
        isIsolatedOrigin: false,
        urlHasSubdomainConfigRequest: false,
        subdomainHasConfig: false,
        subdomainParts: { parentDomain: 'example.com', id: null, protocol: null },
        compressedConfig: null
      }

      const result = await getConfigRedirectUrl(state)
      expect(result).to.be.null()
    })

    it('should return null when subdomain config request already exists', async () => {
      const url = new URL('https://cid.ipfs.example.com/foo?ipfs-sw-subdomain-request=true')
      const state = {
        url,
        isIsolatedOrigin: true,
        urlHasSubdomainConfigRequest: true,
        subdomainHasConfig: false,
        subdomainParts: { parentDomain: 'example.com', id: 'cid', protocol: 'ipfs' },
        compressedConfig: null
      }

      const result = await getConfigRedirectUrl(state)
      expect(result).to.be.null()
    })

    it('should return null when compressed config already exists', async () => {
      const url = new URL('https://cid.ipfs.example.com/foo?ipfs-sw-cfg=compressed')
      const state = {
        url,
        isIsolatedOrigin: true,
        urlHasSubdomainConfigRequest: false,
        subdomainHasConfig: false,
        subdomainParts: { parentDomain: 'example.com', id: 'cid', protocol: 'ipfs' },
        compressedConfig: 'compressed'
      }

      const result = await getConfigRedirectUrl(state)
      expect(result).to.be.null()
    })

    it('should redirect to root domain with subdomain request for IPFS subdomain', async () => {
      const url = new URL('https://bafybeigccimv3zqm5g4jt363faybagywkvqbrismoquogimy7kvz2sj7sq.ipfs.example.com/foo/bar')
      const state = {
        url,
        isIsolatedOrigin: true,
        urlHasSubdomainConfigRequest: false,
        subdomainHasConfig: false,
        subdomainParts: {
          parentDomain: 'example.com',
          id: 'bafybeigccimv3zqm5g4jt363faybagywkvqbrismoquogimy7kvz2sj7sq',
          protocol: 'ipfs'
        },
        compressedConfig: null
      }

      const result = await getConfigRedirectUrl(state)
      expect(result).to.not.be.null()

      const redirectUrl = new URL(result!)
      expect(redirectUrl.origin).to.equal('https://example.com')
      expect(redirectUrl.pathname).to.equal('/')
      expect(redirectUrl.searchParams.get(QUERY_PARAMS.IPFS_SW_SUBDOMAIN_REQUEST)).to.equal('true')
      expect(redirectUrl.searchParams.get(QUERY_PARAMS.HELIA_SW)).to.equal('/ipfs/bafybeigccimv3zqm5g4jt363faybagywkvqbrismoquogimy7kvz2sj7sq/foo/bar')
    })

    it('should redirect to root domain with subdomain request for libp2p-key subdomain and path', async () => {
      const url = new URL('https://k51qzi5uqu5dk3v4rmjber23h16xnr23bsggmqqil9z2gduiis5se8dht36dam.ipns.example.com/foo/bar')
      const state = {
        url,
        isIsolatedOrigin: true,
        urlHasSubdomainConfigRequest: false,
        subdomainHasConfig: false,
        subdomainParts: {
          parentDomain: 'example.com',
          id: 'k51qzi5uqu5dk3v4rmjber23h16xnr23bsggmqqil9z2gduiis5se8dht36dam',
          protocol: 'ipns'
        },
        compressedConfig: null
      }

      const result = await getConfigRedirectUrl(state)
      expect(result).to.not.be.null()

      const redirectUrl = new URL(result!)
      expect(redirectUrl.origin).to.equal('https://example.com')
      expect(redirectUrl.pathname).to.equal('/')
      expect(redirectUrl.searchParams.get(QUERY_PARAMS.IPFS_SW_SUBDOMAIN_REQUEST)).to.equal('true')
      expect(redirectUrl.searchParams.get(QUERY_PARAMS.HELIA_SW)).to.equal('/ipns/k51qzi5uqu5dk3v4rmjber23h16xnr23bsggmqqil9z2gduiis5se8dht36dam/foo/bar')
    })

    it('should preserve existing helia-sw parameter and combine with subdomain path', async () => {
      const url = new URL('https://cid.ipfs.example.com/foo/bar?helia-sw=/existing/path')
      const state = {
        url,
        isIsolatedOrigin: true,
        urlHasSubdomainConfigRequest: false,
        subdomainHasConfig: false,
        subdomainParts: {
          parentDomain: 'example.com',
          id: 'cid',
          protocol: 'ipfs'
        },
        compressedConfig: null
      }

      const result = await getConfigRedirectUrl(state)
      expect(result).to.not.be.null()

      const redirectUrl = new URL(result!)
      expect(redirectUrl.searchParams.get(QUERY_PARAMS.HELIA_SW)).to.equal('/ipfs/cid/foo/bar/existing/path')
    })

    it('should preserve hash from original URL', async () => {
      const url = new URL('https://cid.ipfs.example.com/foo/bar#section1')
      const state = {
        url,
        isIsolatedOrigin: true,
        urlHasSubdomainConfigRequest: false,
        subdomainHasConfig: false,
        subdomainParts: {
          parentDomain: 'example.com',
          id: 'cid',
          protocol: 'ipfs'
        },
        compressedConfig: null
      }

      const result = await getConfigRedirectUrl(state)
      expect(result).to.not.be.null()

      const redirectUrl = new URL(result!)
      expect(redirectUrl.hash).to.equal('#section1')
    })

    it('should preserve existing query parameters from original URL', async () => {
      const url = new URL('https://cid.ipfs.example.com/foo/bar?param1=value1&param2=value2')
      const state = {
        url,
        isIsolatedOrigin: true,
        urlHasSubdomainConfigRequest: false,
        subdomainHasConfig: false,
        subdomainParts: {
          parentDomain: 'example.com',
          id: 'cid',
          protocol: 'ipfs'
        },
        compressedConfig: null
      }

      const result = await getConfigRedirectUrl(state)
      expect(result).to.not.be.null()

      const redirectUrl = new URL(result!)
      expect(redirectUrl.searchParams.get('param1')).to.equal('value1')
      expect(redirectUrl.searchParams.get('param2')).to.equal('value2')
      expect(redirectUrl.searchParams.get(QUERY_PARAMS.IPFS_SW_SUBDOMAIN_REQUEST)).to.equal('true')
      expect(redirectUrl.searchParams.get(QUERY_PARAMS.HELIA_SW)).to.equal('/ipfs/cid/foo/bar')
    })

    it('should handle root path correctly', async () => {
      const url = new URL('https://cid.ipfs.example.com/')
      const state = {
        url,
        isIsolatedOrigin: true,
        urlHasSubdomainConfigRequest: false,
        subdomainHasConfig: false,
        subdomainParts: {
          parentDomain: 'example.com',
          id: 'cid',
          protocol: 'ipfs'
        },
        compressedConfig: null
      }

      const result = await getConfigRedirectUrl(state)
      expect(result).to.not.be.null()

      const redirectUrl = new URL(result!)
      expect(redirectUrl.searchParams.get(QUERY_PARAMS.HELIA_SW)).to.equal('/ipfs/cid/')
    })

    it('should handle ipns subdomain with path', async () => {
      const url = new URL('https://docs-ipfs-tech.ipns.example.com/how-to/')
      const state = {
        url,
        isIsolatedOrigin: true,
        urlHasSubdomainConfigRequest: false,
        subdomainHasConfig: false,
        subdomainParts: {
          parentDomain: 'example.com',
          id: 'docs-ipfs-tech',
          protocol: 'ipns'
        },
        compressedConfig: null
      }

      const result = await getConfigRedirectUrl(state)
      expect(result).to.not.be.null()

      const redirectUrl = new URL(result!)
      expect(redirectUrl.searchParams.get(QUERY_PARAMS.HELIA_SW)).to.equal('/ipns/docs-ipfs-tech/how-to/')
    })
  })

  describe('getUrlWithConfig', () => {
    // skip if nodejs because we don't have indexedDB
    if (!isBrowser) {
      return
    }

    it('should return null for isolated origin', async () => {
      const url = new URL('https://cid.ipfs.example.com/foo?ipfs-sw-subdomain-request=true&helia-sw=/ipfs/cid/foo')
      const state = {
        url,
        isIsolatedOrigin: true,
        urlHasSubdomainConfigRequest: true,
        subdomainHasConfig: false,
        subdomainParts: { parentDomain: 'example.com', id: 'cid', protocol: 'ipfs' },
        compressedConfig: null
      }

      const result = await getUrlWithConfig(state)
      expect(result).to.be.null()
    })

    it('should return null when no subdomain config request', async () => {
      const url = new URL('https://example.com/foo?helia-sw=/ipfs/cid/foo')
      const state = {
        url,
        isIsolatedOrigin: false,
        urlHasSubdomainConfigRequest: false,
        subdomainHasConfig: false,
        subdomainParts: { parentDomain: 'example.com', id: null, protocol: null },
        compressedConfig: null
      }

      const result = await getUrlWithConfig(state)
      expect(result).to.be.null()
    })

    it('should process subdomain config request on root domain', async () => {
      const url = new URL('https://example.com/?ipfs-sw-subdomain-request=true&helia-sw=/ipfs/bafybeigccimv3zqm5g4jt363faybagywkvqbrismoquogimy7kvz2sj7sq/foo/bar')
      const state = {
        url,
        isIsolatedOrigin: false,
        urlHasSubdomainConfigRequest: true,
        subdomainHasConfig: false,
        subdomainParts: { parentDomain: 'example.com', id: null, protocol: null },
        compressedConfig: null
      }

      const result = await getUrlWithConfig(state)
      expect(result).to.not.be.null()

      const resultUrl = new URL(result!)
      // Should be a subdomain URL
      expect(resultUrl.host).to.include('.ipfs.example.com')
      // Should have the compressed config parameter
      expect(resultUrl.searchParams.has(QUERY_PARAMS.IPFS_SW_CFG)).to.be.true()
      // Should not have the subdomain request parameter
      expect(resultUrl.searchParams.has(QUERY_PARAMS.IPFS_SW_SUBDOMAIN_REQUEST)).to.be.false()
      // Should have helia-sw parameter with the path
      expect(resultUrl.searchParams.get(QUERY_PARAMS.HELIA_SW)).to.equal('/foo/bar')
    })

    it('should handle IPNS subdomain config request', async () => {
      const url = new URL('https://example.com/?ipfs-sw-subdomain-request=true&helia-sw=/ipns/k51qzi5uqu5dk3v4rmjber23h16xnr23bsggmqqil9z2gduiis5se8dht36dam/docs/readme')
      const state = {
        url,
        isIsolatedOrigin: false,
        urlHasSubdomainConfigRequest: true,
        subdomainHasConfig: false,
        subdomainParts: { parentDomain: 'example.com', id: null, protocol: null },
        compressedConfig: null
      }

      const result = await getUrlWithConfig(state)
      expect(result).to.not.be.null()

      const resultUrl = new URL(result!)
      // Should be a subdomain URL
      expect(resultUrl.host).to.include('.ipns.example.com')
      // Should have the compressed config parameter
      expect(resultUrl.searchParams.has(QUERY_PARAMS.IPFS_SW_CFG)).to.be.true()
      // Should have helia-sw parameter with the path
      expect(resultUrl.searchParams.get(QUERY_PARAMS.HELIA_SW)).to.equal('/docs/readme')
    })

    it('should preserve existing query parameters', async () => {
      const url = new URL('https://example.com/?ipfs-sw-subdomain-request=true&helia-sw=/ipfs/cid/foo&param1=value1&param2=value2')
      const state = {
        url,
        isIsolatedOrigin: false,
        urlHasSubdomainConfigRequest: true,
        subdomainHasConfig: false,
        subdomainParts: { parentDomain: 'example.com', id: null, protocol: null },
        compressedConfig: null
      }

      const result = await getUrlWithConfig(state)
      expect(result).to.not.be.null()

      const resultUrl = new URL(result!)
      expect(resultUrl.searchParams.get('param1')).to.equal('value1')
      expect(resultUrl.searchParams.get('param2')).to.equal('value2')
      expect(resultUrl.searchParams.has(QUERY_PARAMS.IPFS_SW_CFG)).to.be.true()
    })

    it('should preserve hash from original URL', async () => {
      const url = new URL('https://example.com/?ipfs-sw-subdomain-request=true&helia-sw=/ipfs/cid/foo#section1')
      const state = {
        url,
        isIsolatedOrigin: false,
        urlHasSubdomainConfigRequest: true,
        subdomainHasConfig: false,
        subdomainParts: { parentDomain: 'example.com', id: null, protocol: null },
        compressedConfig: null
      }

      const result = await getUrlWithConfig(state)
      expect(result).to.not.be.null()

      const resultUrl = new URL(result!)
      expect(resultUrl.hash).to.equal('#section1')
    })

    it('should handle root path correctly', async () => {
      const url = new URL('https://example.com/?ipfs-sw-subdomain-request=true&helia-sw=/ipfs/cid/')
      const state = {
        url,
        isIsolatedOrigin: false,
        urlHasSubdomainConfigRequest: true,
        subdomainHasConfig: false,
        subdomainParts: { parentDomain: 'example.com', id: null, protocol: null },
        compressedConfig: null
      }

      const result = await getUrlWithConfig(state)
      expect(result).to.not.be.null()

      const resultUrl = new URL(result!)
      expect(resultUrl.searchParams.get(QUERY_PARAMS.HELIA_SW)).to.be.null()
      expect(resultUrl.pathname).to.equal('/')
      expect(resultUrl.origin).to.equal('https://cid.ipfs.example.com')
    })

    it('should handle DNSLink subdomain config request', async () => {
      const url = new URL('https://example.com/?ipfs-sw-subdomain-request=true&helia-sw=/ipns/docs-ipfs-tech/how-to/')
      const state = {
        url,
        isIsolatedOrigin: false,
        urlHasSubdomainConfigRequest: true,
        subdomainHasConfig: false,
        subdomainParts: { parentDomain: 'example.com', id: null, protocol: null },
        compressedConfig: null
      }

      const result = await getUrlWithConfig(state)
      expect(result).to.not.be.null()

      const resultUrl = new URL(result!)
      // Should be a subdomain URL
      expect(resultUrl.host).to.include('.ipns.example.com')
      // Should have the compressed config parameter
      expect(resultUrl.searchParams.has(QUERY_PARAMS.IPFS_SW_CFG)).to.be.true()
      // Should have helia-sw parameter with the path
      expect(resultUrl.searchParams.get(QUERY_PARAMS.HELIA_SW)).to.equal('/how-to')
    })

    it('should handle complex path with special characters', async () => {
      const url = new URL('https://example.com/?ipfs-sw-subdomain-request=true&helia-sw=/ipfs/bafybeigccimv3zqm5g4jt363faybagywkvqbrismoquogimy7kvz2sj7sq/1 - Barrel - Part 1 - alt.txt')
      const state = {
        url,
        isIsolatedOrigin: false,
        urlHasSubdomainConfigRequest: true,
        subdomainHasConfig: false,
        subdomainParts: { parentDomain: 'example.com', id: null, protocol: null },
        compressedConfig: null
      }

      const result = await getUrlWithConfig(state)
      expect(result).to.not.be.null()

      const resultUrl = new URL(result!)
      expect(resultUrl.searchParams.get(QUERY_PARAMS.HELIA_SW)).to.equal('/1 - Barrel - Part 1 - alt.txt')
    })

    it('should handle URL with no helia-sw parameter', async () => {
      const url = new URL('https://example.com/ipfs/cid/foo?ipfs-sw-subdomain-request=true')
      const state = {
        url,
        isIsolatedOrigin: false,
        urlHasSubdomainConfigRequest: true,
        subdomainHasConfig: false,
        subdomainParts: { parentDomain: 'example.com', id: null, protocol: null },
        compressedConfig: null
      }

      const result = await getUrlWithConfig(state)
      expect(result).to.not.be.null()

      const resultUrl = new URL(result!)
      // Should have the compressed config parameter
      expect(resultUrl.searchParams.has(QUERY_PARAMS.IPFS_SW_CFG)).to.be.true()
      // Should not have the subdomain request parameter
      expect(resultUrl.searchParams.has(QUERY_PARAMS.IPFS_SW_SUBDOMAIN_REQUEST)).to.be.false()
    })
  })
})
