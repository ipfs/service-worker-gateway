import { RecordType } from '@multiformats/dns'
import { expect } from 'aegir/chai'
import { createEnsDnsResolver } from '../../../src/sw/lib/ens-resolver.ts'

describe('/sw/lib/ens-resolver.js', () => {
  it('should synthesize a DNSLink TXT answer for .eth domains', async function () {
    this.timeout(30_000)

    const resolver = createEnsDnsResolver()
    const result = await resolver('_dnslink.vitalik.eth', {
      types: [RecordType.TXT]
    })

    expect(result.Status).to.equal(0)
    expect(result.Answer).to.have.lengthOf(1)
    expect(result.Answer[0].name).to.equal('_dnslink.vitalik.eth')
    expect(result.Answer[0].type).to.equal(RecordType.TXT)
    expect(result.Answer[0].data).to.match(/^dnslink=\/ip(fs|ns)\//)
  })
})
