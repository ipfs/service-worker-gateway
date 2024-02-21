/* eslint-env mocha */
import { expect } from 'aegir/chai'
import { isPathOrSubdomainRequest } from '../src/lib/path-or-subdomain.ts'

describe('isPathOrSubdomainRequest', () => {
  it('returns true for path-based request', () => {
    expect(isPathOrSubdomainRequest('example.com', {
      hostname: 'example.com',
      pathname: '/ipfs/bafyFoo'
    })).to.equal(true)
    expect(isPathOrSubdomainRequest('example.com', {
      hostname: 'example.com',
      pathname: '/ipns/specs.ipfs.tech'
    })).to.equal(true)
  })

  it('returns true for subdomain request', () => {
    expect(isPathOrSubdomainRequest('example.com', {
      hostname: 'bafyFoo.ipfs.example.com',
      pathname: '/'
    })).to.equal(true)
    expect(isPathOrSubdomainRequest('example.com', {
      hostname: 'specs-ipfs-tech.ipns.example.com',
      pathname: '/'
    })).to.equal(true)
  })

  it('returns false for non-path and non-subdomain request', () => {
    expect(isPathOrSubdomainRequest('example.com', {
      hostname: 'example.com',
      pathname: '/foo/bar'
    })).to.equal(false)
    expect(isPathOrSubdomainRequest('example.com', {
      hostname: 'foo.bar.example.com',
      pathname: '/'
    })).to.equal(false)
  })
})
