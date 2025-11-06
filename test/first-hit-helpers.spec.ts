/* eslint-env mocha */
import { expect } from 'aegir/chai'
import { isBrowser } from 'wherearewe'
import { HASH_FRAGMENTS, QUERY_PARAMS } from '../src/lib/constants.js'
import { getHeliaSwRedirectUrl, getStateFromUrl } from '../src/lib/first-hit-helpers.js'

function expectRedirect ({ from, to }: { from: string, to: string }): void {
  const fromURL = new URL(from)
  const toURL = new URL(to)

  const newURL = getHeliaSwRedirectUrl(fromURL, toURL)

  // should equal the expected URL
  expect(newURL.toString()).to.equal(to)

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
        to: `http://localhost:3334/?helia-sw=${encodeURIComponent('/ipfs/bafkqablimvwgy3y?foo=bar')}`
      })
    })

    it('should handle origin isolation redirect hash', () => {
      expectRedirect({
        from: 'http://localhost:3334/ipfs/bafkqablimvwgy3y#/ipfs-sw-origin-isolation-warning',
        to: `http://localhost:3334/?helia-sw=${encodeURIComponent('/ipfs/bafkqablimvwgy3y#/ipfs-sw-origin-isolation-warning')}`
      })
    })

    it('should handle origin isolation redirect hash with query string', () => {
      expectRedirect({
        from: 'http://localhost:3334/ipfs/bafkqablimvwgy3y?foo=bar#/ipfs-sw-origin-isolation-warning',
        to: `http://localhost:3334/?helia-sw=${encodeURIComponent('/ipfs/bafkqablimvwgy3y?foo=bar#/ipfs-sw-origin-isolation-warning')}`
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

    it('should handle malformed URL encoding gracefully', () => {
      // Create a URL with invalid encoding that would cause decodeURIComponent to throw
      const originalURL = new URL('http://localhost:3334/ipfs/bafkqablimvwgy3y')
      // Mock the pathname to have invalid encoding
      Object.defineProperty(originalURL, 'pathname', {
        get: () => '/ipfs/bafkqablimvwgy3y%',
        configurable: true
      })

      const result = getHeliaSwRedirectUrl(originalURL)
      expect(result.searchParams.get(QUERY_PARAMS.REDIRECT)).to.equal('/ipfs/bafkqablimvwgy3y%')
    })

    it('should handle root path correctly', () => {
      const originalURL = new URL('http://localhost:3334/')
      const result = getHeliaSwRedirectUrl(originalURL)
      expect(result.searchParams.has(QUERY_PARAMS.REDIRECT)).to.be.false()
      expect(result.pathname).to.equal('/')
    })

    it('should handle targetURL parameter', () => {
      const originalURL = new URL('http://localhost:3334/ipfs/bafkqablimvwgy3y')
      const targetURL = new URL('http://example.com/custom-path?existing=param')

      const result = getHeliaSwRedirectUrl(originalURL, targetURL)
      expect(result.origin).to.equal('http://example.com')
      expect(result.pathname).to.equal('/custom-path')
      expect(result.searchParams.get('existing')).to.equal('param')
      expect(result.searchParams.get(QUERY_PARAMS.REDIRECT)).to.equal('/ipfs/bafkqablimvwgy3y')
    })

    it.skip('should preserve existing query parameters when targetURL is provided', () => {
      const originalURL = new URL('http://localhost:3334/ipfs/bafkqablimvwgy3y?param1=value1&param2=value2')
      const targetURL = new URL('http://example.com/?existing=param')

      const result = getHeliaSwRedirectUrl(originalURL, targetURL)
      expect(result.searchParams.get('existing')).to.equal('param')
      expect(result.searchParams.get('param1')).to.equal('value1')
      expect(result.searchParams.get('param2')).to.equal('value2')
    })

    it('should not override existing parameters in targetURL', () => {
      const originalURL = new URL('http://localhost:3334/ipfs/bafkqablimvwgy3y?param1=value1')
      const targetURL = new URL('http://example.com/?param1=existing-value')

      const result = getHeliaSwRedirectUrl(originalURL, targetURL)
      expect(result.searchParams.get('param1')).to.equal('existing-value')
    })

    it('should handle null targetURL', () => {
      const originalURL = new URL('http://localhost:3334/ipfs/bafkqablimvwgy3y')
      const result = getHeliaSwRedirectUrl(originalURL, null)
      expect(result.origin).to.equal('http://localhost:3334')
      expect(result.pathname).to.equal('/')
      expect(result.searchParams.get(QUERY_PARAMS.REDIRECT)).to.equal('/ipfs/bafkqablimvwgy3y')
    })

    it('should handle undefined targetURL', () => {
      const originalURL = new URL('http://localhost:3334/ipfs/bafkqablimvwgy3y')
      const result = getHeliaSwRedirectUrl(originalURL, undefined)
      expect(result.origin).to.equal('http://localhost:3334')
      expect(result.pathname).to.equal('/')
      expect(result.searchParams.get(QUERY_PARAMS.REDIRECT)).to.equal('/ipfs/bafkqablimvwgy3y')
    })

    it('should handle empty hash', () => {
      const originalURL = new URL('http://localhost:3334/ipfs/bafkqablimvwgy3y')
      originalURL.hash = ''
      const result = getHeliaSwRedirectUrl(originalURL)
      expect(result.hash).to.equal('')
    })
  })
})

describe('getStateFromUrl', () => {
  // skip if nodejs because we don't have indexedDB
  if (!isBrowser) {
    return
  }

  it('should return correct state for path gateway request', async () => {
    const url = new URL('https://example.com/ipfs/bafkqablimvwgy3y')
    const state = await getStateFromUrl(url)

    expect(state.isIsolatedOrigin).to.be.false()
    expect(state.urlHasSubdomainConfigRequest).to.be.false()
    expect(state.url).to.equal(url)
    expect(state.subdomainParts.parentDomain).to.equal('example.com')
    expect(state.subdomainParts.id).to.be.null()
    expect(state.subdomainParts.protocol).to.be.null()
    expect(state.compressedConfig).to.be.null()
    expect(state.requestForContentAddressedData).to.be.true()
    expect(state.supportsSubdomains).to.be.false()
  })

  it('should return correct state for subdomain gateway request', async () => {
    const url = new URL('https://bafkqablimvwgy3y.ipfs.example.com/')
    const state = await getStateFromUrl(url)

    expect(state.isIsolatedOrigin).to.be.true()
    expect(state.urlHasSubdomainConfigRequest).to.be.false()
    expect(state.url).to.equal(url)
    expect(state.subdomainParts.parentDomain).to.equal('example.com')
    expect(state.subdomainParts.id).to.equal('bafkqablimvwgy3y')
    expect(state.subdomainParts.protocol).to.equal('ipfs')
    expect(state.compressedConfig).to.be.null()
    expect(state.requestForContentAddressedData).to.be.true()
    expect(state.supportsSubdomains).to.be.true()
  })

  it('should return correct state for subdomain config request', async () => {
    const url = new URL(`https://example.com/?helia-sw=/ipfs/cid/foo#${HASH_FRAGMENTS.IPFS_SW_SUBDOMAIN_REQUEST}=true`)
    const state = await getStateFromUrl(url)

    expect(state.isIsolatedOrigin).to.be.false()
    expect(state.urlHasSubdomainConfigRequest).to.be.true()
    expect(state.url).to.equal(url)
    expect(state.subdomainParts.parentDomain).to.equal('example.com')
    expect(state.subdomainParts.id).to.be.null()
    expect(state.subdomainParts.protocol).to.be.null()
    expect(state.compressedConfig).to.be.null()
    expect(state.requestForContentAddressedData).to.be.true()
    expect(state.supportsSubdomains).to.be.true()
  })

  it('should return correct state for URL with compressed config', async () => {
    const url = new URL(`https://cid.ipfs.example.com/#${HASH_FRAGMENTS.IPFS_SW_CFG}=compressed-config`)
    const state = await getStateFromUrl(url)

    expect(state.isIsolatedOrigin).to.be.true()
    expect(state.urlHasSubdomainConfigRequest).to.be.false()
    expect(state.url).to.equal(url)
    expect(state.subdomainParts.parentDomain).to.equal('example.com')
    expect(state.subdomainParts.id).to.equal('cid')
    expect(state.subdomainParts.protocol).to.equal('ipfs')
    expect(state.compressedConfig).to.equal('compressed-config')
    expect(state.requestForContentAddressedData).to.be.true()
  })

  it('should return correct state for origin-isolation-warning page request', async () => {
    const url = new URL(`https://example.com/#/${HASH_FRAGMENTS.IPFS_SW_ORIGIN_ISOLATION_WARNING}`)
    const state = await getStateFromUrl(url)

    expect(state.isIsolatedOrigin).to.be.false()
    expect(state.urlHasSubdomainConfigRequest).to.be.false()
    expect(state.url).to.equal(url)
    expect(state.subdomainParts.parentDomain).to.equal('example.com')
    expect(state.subdomainParts.id).to.be.null()
    expect(state.subdomainParts.protocol).to.be.null()
    expect(state.compressedConfig).to.be.null()
    expect(state.requestForContentAddressedData).to.be.false()
  })

  it('should return correct state for config page request', async () => {
    const url = new URL('https://example.com/#/ipfs-sw-config')
    const state = await getStateFromUrl(url)

    expect(state.isIsolatedOrigin).to.be.false()
    expect(state.urlHasSubdomainConfigRequest).to.be.false()
    expect(state.url).to.equal(url)
    expect(state.subdomainParts.parentDomain).to.equal('example.com')
    expect(state.subdomainParts.id).to.be.null()
    expect(state.subdomainParts.protocol).to.be.null()
    expect(state.compressedConfig).to.be.null()
    expect(state.requestForContentAddressedData).to.be.false()
  })

  it('should return correct state for helia-sw query param request', async () => {
    const url = new URL('https://example.com/?helia-sw=/ipfs/cid/foo')
    const state = await getStateFromUrl(url)

    expect(state.isIsolatedOrigin).to.be.false()
    expect(state.urlHasSubdomainConfigRequest).to.be.false()
    expect(state.url).to.equal(url)
    expect(state.subdomainParts.parentDomain).to.equal('example.com')
    expect(state.subdomainParts.id).to.be.null()
    expect(state.subdomainParts.protocol).to.be.null()
    expect(state.compressedConfig).to.be.null()
    expect(state.requestForContentAddressedData).to.be.true()
  })
})
