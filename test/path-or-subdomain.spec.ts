/* eslint-env mocha */
import { expect } from 'aegir/chai'
import { base32 } from 'multiformats/bases/base32'
import { base36 } from 'multiformats/bases/base36'
import { CID } from 'multiformats/cid'
import { QUERY_PARAMS } from '../src/lib/constants.js'
import { isPathOrSubdomainRequest, toSubdomainRequest } from '../src/lib/path-or-subdomain.js'

interface Loc {
  protocol: string
  host: string
  pathname: string
  search: string
  hash: string
  href: string
  origin: string
}

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
    const makeLoc = (overrides: Partial<Loc>): Loc => {
      const defaults: Loc = {
        protocol: 'http:',
        host: 'example.com',
        pathname: '/',
        search: '',
        hash: '',
        href: 'http://example.com/',
        origin: 'http://example.com'
      }
      return { ...defaults, ...overrides }
    }

    it('round-trips an /ipfs/<cid>/… request into a DNS-subdomain + helia-sw redirect', () => {
      // Use CIDv0 for this test
      const cid = 'QmbQDovX7wRe9ek7u6QXe9zgCXkTzoUSsTFJEkrYV1HrVR'
      const cidV1 = CID.parse(cid).toV1().toString(base32)
      const loc = makeLoc({
        pathname: `/ipfs/${cid}/foo/bar.txt`,
        href: `http://example.com/ipfs/${cid}/foo/bar.txt`
      })

      const out = toSubdomainRequest(loc)
      const exp = new URL(`http://${cidV1}.ipfs.example.com/`)
      exp.searchParams.set(QUERY_PARAMS.HELIA_SW, '/foo/bar.txt')

      expect(out).to.equal(exp.href)
    })

    it('preserves existing ?search=params and #hash', () => {
      const cid = 'QmbQDovX7wRe9ek7u6QXe9zgCXkTzoUSsTFJEkrYV1HrVR'
      const cidV1 = CID.parse(cid).toV1().toString(base32)
      const loc = makeLoc({
        pathname: `/ipfs/${cid}/path/to/file`,
        search: '?foo=bar&baz=qux',
        hash: '#section2',
        href: `https://example.com/ipfs/${cid}/path/to/file?foo=bar&baz=qux#section2`,
        protocol: 'https:'
      })

      const out = toSubdomainRequest(loc)
      const exp = new URL(`https://${cidV1}.ipfs.example.com/`)
      exp.searchParams.set(QUERY_PARAMS.HELIA_SW, '/path/to/file')
      exp.searchParams.set('foo', 'bar')
      exp.searchParams.set('baz', 'qux')
      exp.hash = '#section2'

      expect(out).to.equal(exp.href)
    })

    it('drops helia-sw when there is no “extra” path (i.e. only /ipfs/<cid>)', () => {
      const cid = 'QmbQDovX7wRe9ek7u6QXe9zgCXkTzoUSsTFJEkrYV1HrVR'
      const cidV1 = CID.parse(cid).toV1().toString(base32)
      const loc = makeLoc({
        pathname: `/ipfs/${cid}`,
        href: `http://example.com/ipfs/${cid}`
      })

      const out = toSubdomainRequest(loc)
      expect(out).to.equal(`http://${cidV1}.ipfs.example.com/`)
    })

    it('handles /ipns/<libp2p-key>/… by converting to Base36 and preserving rest', () => {
      // Use a valid libp2p-key CIDv1 in base36 for testing
      const key = 'k51qzi5uqu5dh9ihj4p2v5sl3hxvv27ryx2w0xrsv6jmmqi91t9xp8p9kaipc2'
      const keyV1 = CID.parse(key).toV1().toString(base36)
      const loc = makeLoc({
        protocol: 'https:',
        host: 'gateway.local',
        pathname: `/ipns/${key}/blog/post`,
        href: `https://gateway.local/ipns/${key}/blog/post`
      })

      const out = toSubdomainRequest(loc)
      const exp = new URL(`https://${keyV1}.ipns.gateway.local/`)
      exp.searchParams.set(QUERY_PARAMS.HELIA_SW, '/blog/post')
      expect(out).to.equal(exp.href)
    })

    it('falls back to dnsLink-encoding when the second segment is not a CID but contains dots', () => {
      const hostname = 'mysite.local'
      const loc = makeLoc({
        host: hostname,
        pathname: '/ipns/foo.bar/baz',
        href: `http://${hostname}/ipns/foo.bar/baz`
      })

      const out = toSubdomainRequest(loc)
      const url = new URL(out)
      expect(url.origin).to.equal(`http://foo-bar.ipns.${hostname}`)
      expect(url.pathname).to.equal('/')
      expect(url.searchParams.get(QUERY_PARAMS.HELIA_SW)).to.equal('/baz')
    })

    it('ignores invalid namespaces', () => {
      // TODO: This test was added without modifying the code, and i'm not sure we want this functionality.
      const loc = makeLoc({ pathname: '/potato/QmWhatever/foo', href: 'http://example.com/potato/QmWhatever/foo' })
      const out = toSubdomainRequest(loc)
      const url = new URL(out)
      expect(url.origin).to.equal('http://qmwhatever.potato.example.com')
      expect(url.searchParams.get(QUERY_PARAMS.HELIA_SW)).to.equal('/foo')
    })

    it('doesnt use ipfs-sw-first-hit.html in the path', () => {
      const loc = makeLoc({ pathname: '/ipfs-sw-first-hit.html/ipfs/bafkqablimvwgy3y', href: 'http://example.com/ipfs-sw-first-hit.html/ipfs/bafkqablimvwgy3y' })
      const out = toSubdomainRequest(loc)
      const url = new URL(out)
      expect(url.origin).to.equal('http://bafkqablimvwgy3y.ipfs.example.com')
      expect(url.searchParams.get(QUERY_PARAMS.HELIA_SW)).to.equal(null)
    })
  })
})
