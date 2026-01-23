import { expect } from 'aegir/chai'
import { getSubdomainParts } from '../src/lib/get-subdomain-parts.ts'

describe('get-subdomain-parts', () => {
  it('should support deeply nested subdomains', () => {
    const actualHost = 'some.deep.nested.subdomain.localhost'
    const url = `https://bafyfoo.ipfs.${actualHost}`
    const parts = getSubdomainParts(url)
    expect(parts.id).to.equal('bafyfoo')
    expect(parts.parentDomain).to.equal(actualHost)
    expect(parts.protocol).to.equal('ipfs')
  })

  it('should support deeply nested subdomains with port', () => {
    const actualHost = 'some.deep.nested.subdomain.localhost:3000'
    const url = `https://bafyfoo.ipfs.${actualHost}`
    const parts = getSubdomainParts(url)
    expect(parts.id).to.equal('bafyfoo')
    expect(parts.parentDomain).to.equal(actualHost)
    expect(parts.protocol).to.equal('ipfs')
  })

  it('should ignore path, hash, and query params', () => {
    const actualHost = 'some.deep.nested.subdomain.localhost'
    const url = `https://bafyfoo.ipfs.${actualHost}/path/to/file?query=param#hash`
    const parts = getSubdomainParts(url)
    expect(parts.id).to.equal('bafyfoo')
    expect(parts.parentDomain).to.equal(actualHost)
    expect(parts.protocol).to.equal('ipfs')
  })

  it('should ignore path, hash, and query params when there is no subdomain', () => {
    const actualHost = 'localhost:3000'
    const url = `https://${actualHost}/ipfs/bafyfoo?query=param#hash`
    const parts = getSubdomainParts(url)
    expect(parts.id).to.equal(null)
    expect(parts.parentDomain).to.equal(actualHost)
    expect(parts.protocol).to.equal(null)
  })
})
