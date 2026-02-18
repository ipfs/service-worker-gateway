import { expect } from 'aegir/chai'
import { dnsLinkLabelEncoder } from '../../src/lib/dns-link-labels.ts'
import { parseRequest } from '../../src/lib/parse-request.ts'
import { buildPrewarmUrls } from '../../src/lib/prewarm-content.ts'

const options = {
  routers: ['https://delegated-ipfs.dev'],
  dnsResolvers: {
    '.': 'https://delegated-ipfs.dev/dns-query'
  }
}

describe('prewarm-content', () => {
  it('builds provider query for ipfs requests', () => {
    const request = parseRequest(new URL('https://bafyaaaa.ipfs.localhost:3000/'), new URL('https://localhost:3000'))
    const urls = buildPrewarmUrls(request, options)

    expect(urls).to.have.lengthOf(1)
    expect(urls[0].toString()).to.equal('https://delegated-ipfs.dev/routing/v1/providers/bafyaaaa?filter-addrs=wss%2Ctls%2Chttps&filter-protocols=unknown%2Ctransport-bitswap%2Ctransport-ipfs-gateway-http')
  })

  it('builds routing query for ipns requests', () => {
    const ipnsName = 'k51qzi5uqu5djpzsgwway43y9oc6p6zf2mco05x7yo6njcs9n1u4s19416t69w'
    const request = parseRequest(new URL(`https://${ipnsName}.ipns.localhost:3000/`), new URL('https://localhost:3000'))
    const urls = buildPrewarmUrls(request, options)

    expect(urls).to.have.lengthOf(1)
    expect(urls[0].toString()).to.equal(`https://delegated-ipfs.dev/routing/v1/ipns/${ipnsName}`)
  })

  it('builds dns query for dnslink requests', () => {
    const domain = 'docs.ipfs.tech'
    const request = parseRequest(new URL(`https://${dnsLinkLabelEncoder(domain)}.ipns.localhost:3000/`), new URL('https://localhost:3000'))
    const urls = buildPrewarmUrls(request, options)

    expect(urls).to.have.lengthOf(1)
    expect(urls[0].toString()).to.equal('https://delegated-ipfs.dev/dns-query?name=_dnslink.docs.ipfs.tech&type=TXT')
  })
})
