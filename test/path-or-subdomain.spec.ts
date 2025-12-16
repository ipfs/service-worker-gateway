/* eslint-env mocha */
import { expect } from 'aegir/chai'
import { base32 } from 'multiformats/bases/base32'
import { base36 } from 'multiformats/bases/base36'
import { CID } from 'multiformats/cid'
import { QUERY_PARAMS } from '../src/lib/constants.js'
import { isPathOrSubdomainRequest, toSubdomainRequest } from '../src/lib/path-or-subdomain.js'

describe('path-or-subdomain', () => {
  describe('isPathOrSubdomainRequest', () => {
    it('returns true for path-based request', () => {
      expect(isPathOrSubdomainRequest({
        host: 'example.com',
        pathname: '/ipfs/bafyFoo'
      })).to.equal(true)
      expect(isPathOrSubdomainRequest({
        host: 'example.com',
        pathname: '/ipns/specs.ipfs.tech'
      })).to.equal(true)
    })

    it('returns true for subdomain request', () => {
      expect(isPathOrSubdomainRequest({
        host: 'bafyFoo.ipfs.example.com',
        pathname: '/'
      })).to.equal(true)
      expect(isPathOrSubdomainRequest({
        host: 'docs.ipfs.tech.ipns.example.com',
        pathname: '/'
      })).to.equal(true)
    })

    it('returns true for inlined dnslink subdomain request', () => {
      expect(isPathOrSubdomainRequest({
        host: 'bafyFoo.ipfs.example.com',
        pathname: '/'
      })).to.equal(true)
      expect(isPathOrSubdomainRequest({
        host: 'specs-ipfs-tech.ipns.example.com',
        pathname: '/'
      })).to.equal(true)
    })

    it('returns false for non-path and non-subdomain request', () => {
      expect(isPathOrSubdomainRequest({
        host: 'example.com',
        pathname: '/foo/bar'
      })).to.equal(false)
      expect(isPathOrSubdomainRequest({
        host: 'foo.bar.example.com',
        pathname: '/'
      })).to.equal(false)
    })
  })

  describe('toSubdomainRequest', () => {
    it('round-trips an /ipfs/<cid>/… request into a DNS-subdomain + helia-sw redirect', () => {
      // Use CIDv0 for this test
      const cid = 'QmbQDovX7wRe9ek7u6QXe9zgCXkTzoUSsTFJEkrYV1HrVR'
      const cidV1 = CID.parse(cid).toV1().toString(base32)
      const loc = new URL(`http://example.com/ipfs/${cid}/foo/bar.txt`)

      const out = toSubdomainRequest(loc)
      const exp = new URL(`http://${cidV1}.ipfs.example.com/`)
      exp.searchParams.set(QUERY_PARAMS.REDIRECT, '/foo/bar.txt')

      expect(out.href).to.equal(exp.href)
    })

    it('encodes ?search=params and #hash', () => {
      const cid = 'QmbQDovX7wRe9ek7u6QXe9zgCXkTzoUSsTFJEkrYV1HrVR'
      const cidV1 = CID.parse(cid).toV1().toString(base32)
      const loc = new URL(`https://example.com/ipfs/${cid}/path/to/file?foo=bar&baz=qux#section2`)

      const out = toSubdomainRequest(loc)
      const exp = new URL(`https://${cidV1}.ipfs.example.com/`)
      exp.searchParams.set(QUERY_PARAMS.REDIRECT, '/path/to/file?foo=bar&baz=qux#section2')

      expect(out.href).to.equal(exp.href)
    })

    it(`drops ${QUERY_PARAMS.REDIRECT} when there is no “extra” path (i.e. only /ipfs/<cid>)`, () => {
      const cid = 'QmbQDovX7wRe9ek7u6QXe9zgCXkTzoUSsTFJEkrYV1HrVR'
      const cidV1 = CID.parse(cid).toV1().toString(base32)
      const loc = new URL(`http://example.com/ipfs/${cid}`)

      const out = toSubdomainRequest(loc)
      expect(out.href).to.equal(`http://${cidV1}.ipfs.example.com/`)
    })

    it('handles /ipns/<libp2p-key>/… by converting to Base36 and preserving rest', () => {
      // Use a valid libp2p-key CIDv1 in base36 for testing
      const key = 'k51qzi5uqu5dh9ihj4p2v5sl3hxvv27ryx2w0xrsv6jmmqi91t9xp8p9kaipc2'
      const keyV1 = CID.parse(key).toV1().toString(base36)
      const loc = new URL(`https://gateway.local/ipns/${key}/blog/post`)

      const out = toSubdomainRequest(loc)
      const exp = new URL(`https://${keyV1}.ipns.gateway.local/`)
      exp.searchParams.set(QUERY_PARAMS.REDIRECT, '/blog/post')
      expect(out.href).to.equal(exp.href)
    })

    it('falls back to dnsLink-encoding when the second segment is not a CID but contains dots', () => {
      const hostname = 'mysite.local'
      const loc = new URL(`http://${hostname}/ipns/foo.bar/baz`)

      const out = toSubdomainRequest(loc)
      expect(out.origin).to.equal(`http://foo-bar.ipns.${hostname}`)
      expect(out.pathname).to.equal('/')
      expect(out.searchParams.get(QUERY_PARAMS.REDIRECT)).to.equal('/baz')
    })

    it('ignores invalid namespaces', () => {
      // TODO: This test was added without modifying the code, and i'm not sure we want this functionality.
      const loc = new URL('http://example.com/potato/QmWhatever/foo')
      const out = toSubdomainRequest(loc)
      expect(out.origin).to.equal('http://qmwhatever.potato.example.com')
      expect(out.searchParams.get(QUERY_PARAMS.REDIRECT)).to.equal('/foo')
    })

    it('redirects cloudflare-style CIDv0 requests to a subdomain', () => {
      // Use CIDv0 for this test
      const cid = 'QmbQDovX7wRe9ek7u6QXe9zgCXkTzoUSsTFJEkrYV1HrVR'
      const cidV1 = CID.parse(cid).toV1().toString(base32)
      const loc = new URL(`http://example.com/index.html/ipfs/${cid}/foo/bar.txt`)

      const out = toSubdomainRequest(loc)
      const exp = new URL(`http://${cidV1}.ipfs.example.com/`)
      exp.searchParams.set(QUERY_PARAMS.REDIRECT, '/foo/bar.txt')

      expect(out.href).to.equal(exp.href)
    })

    it('redirects cloudflare-style CIDv1 requests to a subdomain', () => {
      // Use CIDv0 for this test
      const cid = 'QmbQDovX7wRe9ek7u6QXe9zgCXkTzoUSsTFJEkrYV1HrVR'
      const cidV1 = CID.parse(cid).toV1().toString(base32)
      const loc = new URL(`http://example.com/index.html/ipfs/${cidV1}/foo/bar.txt`)

      const out = toSubdomainRequest(loc)
      const exp = new URL(`http://${cidV1}.ipfs.example.com/`)
      exp.searchParams.set(QUERY_PARAMS.REDIRECT, '/foo/bar.txt')

      expect(out.href).to.equal(exp.href)
    })

    it('should handle paths with spaces', () => {
      const input = new URL('http://localhost:3333/ipfs/bafybeigccimv3zqm5g4jt363faybagywkvqbrismoquogimy7kvz2sj7sq/1 - Barrel - Part 1 - alt.txt')

      expect(toSubdomainRequest(input).href).to.equal(
        new URL(`http://bafybeigccimv3zqm5g4jt363faybagywkvqbrismoquogimy7kvz2sj7sq.ipfs.localhost:3333/?${QUERY_PARAMS.REDIRECT}=${encodeURIComponent('/1%20-%20Barrel%20-%20Part%201%20-%20alt.txt')}`).href
      )
    })
  })
})
