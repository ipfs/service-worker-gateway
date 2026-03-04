import { expect } from 'aegir/chai'
import { dnsLinkEncode } from '../../../src/cloudflare/snippets/dnslink.ts'

describe('DNSLink label encoding', () => {
  it('encodes en.wikipedia-on-ipfs.org', () => {
    expect(dnsLinkEncode('en.wikipedia-on-ipfs.org'), 'en-wikipedia--on--ipfs-org')
  })

  it('encodes specs.ipfs.tech', () => {
    expect(dnsLinkEncode('specs.ipfs.tech'), 'specs-ipfs-tech')
  })

  it('encodes domain without dots or dashes', () => {
    expect(dnsLinkEncode('localhost'), 'localhost')
  })

  it('encodes domain with only dots', () => {
    expect(dnsLinkEncode('example.com'), 'example-com')
  })

  it('encodes domain with only dashes', () => {
    expect(dnsLinkEncode('my-site'), 'my--site')
  })
})
