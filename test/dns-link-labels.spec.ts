import { expect } from 'aegir/chai'
import { dnsLinkLabelDecoder, dnsLinkLabelEncoder } from '../src/lib/dns-link-labels.ts'

describe('dns-link-labels', () => {
  it('should support specs-ipfs-tech', () => {
    const actualDomainName = 'specs.ipfs.tech'
    const encodedLabel = dnsLinkLabelEncoder(actualDomainName)
    expect(encodedLabel).to.equal('specs-ipfs-tech')
    const result = dnsLinkLabelDecoder(encodedLabel)
    expect(result).to.equal(actualDomainName)
  })

  it('should support en.wikipedia-on-ipfs.org', () => {
    const actualDomainName = 'en.wikipedia-on-ipfs.org'
    const encodedLabel = dnsLinkLabelEncoder(actualDomainName)
    expect(encodedLabel).to.equal('en-wikipedia--on--ipfs-org')
    const result = dnsLinkLabelDecoder(encodedLabel)
    expect(result).to.equal(actualDomainName)
  })
})
