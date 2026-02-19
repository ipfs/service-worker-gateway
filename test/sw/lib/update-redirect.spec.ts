import { expect } from 'aegir/chai'
import { updateRedirect } from '../../../src/sw/lib/update-redirect.ts'

describe('/sw/lib/update-redirect.js', () => {
  it('should transform ipfs url to subdomain URL when on the gateway root', () => {
    const cid = 'bafyreidykglsfhoixmivffc5uwhcgshx4j465xwqntbmu43nb2dzqwfvae'
    const gatewayRoot = new URL('http://localhost')
    const origin = gatewayRoot
    const location = `ipfs://${cid}/`

    const response = new Response('', {
      status: 301,
      headers: {
        location
      }
    })

    updateRedirect(origin, gatewayRoot, response)

    expect(response.headers.get('location')).to.equal(`${gatewayRoot.protocol}//${cid}.ipfs.${gatewayRoot.host}/`)
  })

  it('should transform ipfs url to a forward slash when on the subdomain', () => {
    const cid = 'bafyreidykglsfhoixmivffc5uwhcgshx4j465xwqntbmu43nb2dzqwfvae'
    const gatewayRoot = new URL('http://localhost')
    const origin = new URL(`${gatewayRoot.protocol}//${cid}.ipfs.${gatewayRoot.host}`)
    const location = `ipfs://${cid}/`

    const response = new Response('', {
      status: 301,
      headers: {
        location
      }
    })

    updateRedirect(origin, gatewayRoot, response)

    expect(response.headers.get('location')).to.equal('/')
  })

  it('should strip the host when the origin is the same', () => {
    const cid = 'bafyreidykglsfhoixmivffc5uwhcgshx4j465xwqntbmu43nb2dzqwfvae'
    const gatewayRoot = new URL('http://localhost')
    const origin = new URL(`${gatewayRoot.protocol}//${cid}.ipfs.${gatewayRoot.host}`)
    const location = `ipfs://${cid}/foo.html`

    const response = new Response('', {
      status: 301,
      headers: {
        location
      }
    })

    updateRedirect(origin, gatewayRoot, response)

    expect(response.headers.get('location')).to.equal('/foo.html')
  })
})
