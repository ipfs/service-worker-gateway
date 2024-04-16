/* eslint-env mocha */
import { expect } from 'aegir/chai'
import { pathRegex, subdomainRegex } from '../src/lib/regex.js'

const validPathUrls = [
  // IPFS paths without domain
  ['/ipfs/bafyFoo', 'ipfs', 'bafyFoo', ''],
  ['/ipfs/bafyFoo/', 'ipfs', 'bafyFoo', '/'],
  ['/ipfs/bafyFoo/path/to/file', 'ipfs', 'bafyFoo', '/path/to/file'],

  // IPFS paths with domain
  ['http://example.com/ipfs/bafyFoo', 'ipfs', 'bafyFoo', ''],
  ['http://example.com/ipfs/bafyFoo/', 'ipfs', 'bafyFoo', '/'],
  ['http://example.com/ipfs/bafyFoo/path/to/file', 'ipfs', 'bafyFoo', '/path/to/file'],
  ['http://example.com/ipfs/bafyFoo/path/to/file/', 'ipfs', 'bafyFoo', '/path/to/file/'],

  // IPNS paths without domain
  ['/ipns/specs.ipfs.tech', 'ipns', 'specs.ipfs.tech', ''],
  ['/ipns/specs.ipfs.tech/', 'ipns', 'specs.ipfs.tech', '/'],
  ['/ipns/specs.ipfs.tech/path/to/file', 'ipns', 'specs.ipfs.tech', '/path/to/file'],

  // IPNS paths with domain
  ['http://example.com/ipns/specs.ipfs.tech', 'ipns', 'specs.ipfs.tech', ''],
  ['http://example.com/ipns/specs.ipfs.tech/', 'ipns', 'specs.ipfs.tech', '/'],
  ['http://example.com/ipns/specs.ipfs.tech/path/to/file', 'ipns', 'specs.ipfs.tech', '/path/to/file'],
  ['http://example.com/ipns/specs.ipfs.tech/path/to/file/', 'ipns', 'specs.ipfs.tech', '/path/to/file/']
]

const validSubdomainUrls = [
  // IPFS subdomains
  ['http://bafyFoo.ipfs.example.com', 'ipfs', 'bafyFoo', ''],
  ['http://bafyFoo.ipfs.example.com/', 'ipfs', 'bafyFoo', '/'],
  ['http://bafyFoo.ipfs.example.com/path/to/file', 'ipfs', 'bafyFoo', '/path/to/file'],

  // IPNS subdomains
  ['http://bafyFoo.ipns.example.com', 'ipns', 'bafyFoo', ''],
  ['http://bafyFoo.ipns.example.com/', 'ipns', 'bafyFoo', '/'],
  ['http://bafyFoo.ipns.example.com/path/to/file', 'ipns', 'bafyFoo', '/path/to/file'],

  // IPNS subdomains with dnslink
  ['http://specs-ipfs-tech.ipns.example.com', 'ipns', 'specs-ipfs-tech', ''],
  ['http://specs-ipfs-tech.ipns.example.com/', 'ipns', 'specs-ipfs-tech', '/'],
  ['http://specs-ipfs-tech.ipns.example.com/path/to/file', 'ipns', 'specs-ipfs-tech', '/path/to/file']
]

describe('regex', () => {
  describe('paths', () => {
    validPathUrls.forEach(([url, protocol, cidOrPeerIdOrDnslink, path]) => {
      it(`should correctly match "${url}"`, () => {
        const match = url.match(pathRegex)

        expect(match).not.to.be.null()
        expect(match?.groups).to.be.ok()
        expect(match?.groups?.protocol).to.equal(protocol)
        expect(match?.groups?.cidOrPeerIdOrDnslink).to.equal(cidOrPeerIdOrDnslink)
        expect(match?.groups?.path).to.equal(path)
      })
    })
  })

  describe('subdomains', () => {
    validSubdomainUrls.forEach(([url, protocol, cidOrPeerIdOrDnslink, path]) => {
      it(`should correctly match "${url}"`, () => {
        const match = url.match(subdomainRegex)

        expect(match).not.to.be.null()
        expect(match?.groups).to.be.ok()
        expect(match?.groups?.protocol).to.equal(protocol)
        expect(match?.groups?.cidOrPeerIdOrDnslink).to.equal(cidOrPeerIdOrDnslink)
        expect(match?.groups?.path).to.equal(path)
      })
    })
  })

  it('should return null for non-matching urls', () => {
    const url = 'http://localhost/notipfs/bafyFoo/path/to/file'
    const match = url.match(pathRegex)

    expect(match).to.be.null()
  })
})
