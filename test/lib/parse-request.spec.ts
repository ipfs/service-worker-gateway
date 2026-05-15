import { generateKeyPair } from '@libp2p/crypto/keys'
import { peerIdFromPrivateKey, peerIdFromString } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import { base32 } from 'multiformats/bases/base32'
import { base36 } from 'multiformats/bases/base36'
import { CID } from 'multiformats/cid'
import { dnsLinkLabelEncoder } from '../../src/lib/dns-link-labels.ts'
import { parseRequest } from '../../src/lib/parse-request.ts'

describe('parse-request', () => {
  describe('subdomain gateway requests', () => {
    it('should parse IPFS request', () => {
      const cid = 'bafyaaaa'

      expect(parseRequest(new URL(`http://${cid}.ipfs.localhost:3000`), new URL('http://localhost:3000'))).to.deep.equal({
        protocol: 'ipfs',
        type: 'subdomain',
        cid: CID.parse(cid),
        subdomainURL: new URL(`http://${cid}.ipfs.localhost:3000`),
        pathURL: new URL(`http://localhost:3000/ipfs/${cid}/`),
        nativeURL: new URL(`ipfs://${cid}/`)
      })
    })

    it('should parse IPFS request with gateway', () => {
      const cid = 'bafyaaaa'

      expect(parseRequest(new URL(`http://${cid}.ipfs.example.com:8000`), new URL('http://localhost:3000'))).to.deep.equal({
        protocol: 'ipfs',
        type: 'subdomain',
        cid: CID.parse(cid),
        subdomainURL: new URL(`http://${cid}.ipfs.localhost:3000`),
        pathURL: new URL(`http://localhost:3000/ipfs/${cid}/`),
        nativeURL: new URL(`ipfs://${cid}/`)
      })
    })

    it('should parse IPFS request in service worker', () => {
      const cid = 'bafyaaaa'

      expect(parseRequest(new URL(`http://${cid}.ipfs.localhost:3000`), new URL(`http://${cid}.ipfs.localhost:3000/ipfs-sw-sw.js`))).to.deep.equal({
        protocol: 'ipfs',
        type: 'subdomain',
        cid: CID.parse(cid),
        subdomainURL: new URL(`http://${cid}.ipfs.localhost:3000`),
        pathURL: new URL(`http://localhost:3000/ipfs/${cid}/`),
        nativeURL: new URL(`ipfs://${cid}/`)
      })
    })

    it('should parse IPFS request in service worker with a gateway hint', () => {
      const cid = 'bafyaaaa'

      expect(parseRequest(new URL(`http://${cid}.ipfs.localhost:3000/`), new URL(`http://${cid}.ipfs.localhost:3000/ipfs-sw-sw.js`))).to.deep.equal({
        protocol: 'ipfs',
        type: 'subdomain',
        cid: CID.parse(cid),
        subdomainURL: new URL(`http://${cid}.ipfs.localhost:3000/`),
        pathURL: new URL(`http://localhost:3000/ipfs/${cid}/`),
        nativeURL: new URL(`ipfs://${cid}/`)
      })
    })

    it('should parse IPFS request with gateway in the URL', () => {
      const cid = 'bafyaaaa'

      expect(parseRequest(new URL(`http://${cid}.ipfs.localhost:3000`), new URL('http://localhost:3000'))).to.deep.equal({
        protocol: 'ipfs',
        type: 'subdomain',
        cid: CID.parse(cid),
        subdomainURL: new URL(`http://${cid}.ipfs.localhost:3000`),
        pathURL: new URL(`http://localhost:3000/ipfs/${cid}/`),
        nativeURL: new URL(`ipfs://${cid}/`)
      })
    })

    it('should parse IPFS request with gateway and a path', () => {
      const cid = 'bafyaaaa'
      const path = '/foo/bar/baz.txt'

      expect(parseRequest(new URL(`http://${cid}.ipfs.example.com:8000${path}`), new URL('http://localhost:3000'))).to.deep.equal({
        protocol: 'ipfs',
        type: 'subdomain',
        cid: CID.parse(cid),
        subdomainURL: new URL(`http://${cid}.ipfs.localhost:3000${path}`),
        pathURL: new URL(`http://localhost:3000/ipfs/${cid}${path}`),
        nativeURL: new URL(`ipfs://${cid}${path}`)
      })
    })

    it('should parse IPNS request with RSA peerID encoded as base36 CID', async () => {
      const keyPair = await generateKeyPair('RSA')
      const peerId = peerIdFromPrivateKey(keyPair)

      expect(parseRequest(new URL(`http://${peerId.toCID().toString(base36)}.ipns.localhost:3000`), new URL('http://localhost:3000'))).to.deep.equal({
        protocol: 'ipns',
        type: 'subdomain',
        peerId: peerIdFromString(peerId.toString()),
        subdomainURL: new URL(`http://${peerId.toCID().toString(base36)}.ipns.localhost:3000`),
        pathURL: new URL(`http://localhost:3000/ipns/${peerId.toCID().toString(base36)}/`),
        nativeURL: new URL(`ipns://${peerId.toCID().toString(base36)}/`)
      })
    })

    it('should parse IPNS request with Ed25519 peerID encoded as base36 CID', async () => {
      const keyPair = await generateKeyPair('Ed25519')
      const peerId = peerIdFromPrivateKey(keyPair)

      expect(parseRequest(new URL(`http://${peerId.toCID().toString(base36)}.ipns.localhost:3000`), new URL('http://localhost:3000'))).to.deep.equal({
        protocol: 'ipns',
        type: 'subdomain',
        peerId: peerIdFromString(peerId.toString()),
        subdomainURL: new URL(`http://${peerId.toCID().toString(base36)}.ipns.localhost:3000`),
        pathURL: new URL(`http://localhost:3000/ipns/${peerId.toCID().toString(base36)}/`),
        nativeURL: new URL(`ipns://${peerId.toCID().toString(base36)}/`)
      })
    })

    it('should parse IPNS request with secp256k1 peerID encoded as base36 CID', async () => {
      const keyPair = await generateKeyPair('secp256k1')
      const peerId = peerIdFromPrivateKey(keyPair)

      expect(parseRequest(new URL(`http://${peerId.toCID().toString(base36)}.ipns.localhost:3000`), new URL('http://localhost:3000'))).to.deep.equal({
        protocol: 'ipns',
        type: 'subdomain',
        peerId: peerIdFromString(peerId.toString()),
        subdomainURL: new URL(`http://${peerId.toCID().toString(base36)}.ipns.localhost:3000`),
        pathURL: new URL(`http://localhost:3000/ipns/${peerId.toCID().toString(base36)}/`),
        nativeURL: new URL(`ipns://${peerId.toCID().toString(base36)}/`)
      })
    })

    it('should parse DNSLink', async () => {
      const domain = 'test-domain.example.com'

      expect(parseRequest(new URL(`http://${dnsLinkLabelEncoder(domain)}.ipns.localhost:3000`), new URL('http://localhost:3000'))).to.deep.equal({
        protocol: 'dnslink',
        type: 'subdomain',
        domain,
        subdomainURL: new URL(`http://${dnsLinkLabelEncoder(domain)}.ipns.localhost:3000`),
        pathURL: new URL(`http://localhost:3000/ipns/${domain}/`),
        nativeURL: new URL(`ipns://${domain}/`)
      })
    })

    it('should parse DNSLink with path', async () => {
      const domain = 'test-domain.example.com'
      const path = '/foo/bar.txt'

      expect(parseRequest(new URL(`http://${dnsLinkLabelEncoder(domain)}.ipns.localhost:3000${path}`), new URL('http://localhost:3000'))).to.deep.equal({
        protocol: 'dnslink',
        type: 'subdomain',
        domain,
        subdomainURL: new URL(`http://${dnsLinkLabelEncoder(domain)}.ipns.localhost:3000${path}`),
        pathURL: new URL(`http://localhost:3000/ipns/${domain}${path}`),
        nativeURL: new URL(`ipns://${domain}${path}`)
      })
    })
  })

  describe('path gateway requests', () => {
    it('should parse IPFS request with base32 CIDv1', () => {
      const cid = 'bafyaaaa'

      expect(parseRequest(new URL(`http://localhost:3000/ipfs/${cid}`), new URL('http://localhost:3000'))).to.deep.equal({
        protocol: 'ipfs',
        type: 'path',
        cid: CID.parse(cid),
        subdomainURL: new URL(`http://${cid}.ipfs.localhost:3000`),
        pathURL: new URL(`http://localhost:3000/ipfs/${cid}/`),
        nativeURL: new URL(`ipfs://${cid}/`)
      })
    })

    it('should parse IPFS request with IP based HTTP gateway', () => {
      const cid = 'bafyaaaa'

      expect(parseRequest(new URL(`http://127.0.0.1:57721/ipfs/${cid}`), new URL('http://localhost:3000'))).to.deep.equal({
        protocol: 'ipfs',
        type: 'path',
        cid: CID.parse(cid),
        subdomainURL: new URL(`http://${cid}.ipfs.localhost:3000`),
        pathURL: new URL(`http://localhost:3000/ipfs/${cid}/`),
        nativeURL: new URL(`ipfs://${cid}/`)
      })
    })

    it('should parse IPFS request with CIDv0', () => {
      const cid = CID.parse('QmbQDovX7wRe9ek7u6QXe9zgCXkTzoUSsTFJEkrYV1HrVR')

      expect(parseRequest(new URL(`http://localhost:3000/ipfs/${cid}`), new URL('http://localhost:3000'))).to.deep.equal({
        protocol: 'ipfs',
        type: 'path',
        cid,
        subdomainURL: new URL(`http://${cid.toV1().toString(base32)}.ipfs.localhost:3000`),
        pathURL: new URL(`http://localhost:3000/ipfs/${cid}/`),
        nativeURL: new URL(`ipfs://${cid}/`)
      })
    })

    it('should parse IPFS request with base32 CIDv1 with a path', () => {
      const cid = 'bafyaaaa'
      const path = '/foo/bar/baz.txt'

      expect(parseRequest(new URL(`http://localhost:3000/ipfs/${cid}${path}`), new URL('http://localhost:3000'))).to.deep.equal({
        protocol: 'ipfs',
        type: 'path',
        cid: CID.parse(cid),
        subdomainURL: new URL(`http://${cid}.ipfs.localhost:3000${path}`),
        pathURL: new URL(`http://localhost:3000/ipfs/${cid}${path}`),
        nativeURL: new URL(`ipfs://${cid}${path}`)
      })
    })

    it('should parse IPFS request with gateway', () => {
      const cid = 'bafyaaaa'

      expect(parseRequest(new URL(`http://example.com:8000/ipfs/${cid}`), new URL('http://localhost:3000'))).to.deep.equal({
        protocol: 'ipfs',
        type: 'path',
        cid: CID.parse(cid),
        subdomainURL: new URL(`http://${cid}.ipfs.localhost:3000`),
        pathURL: new URL(`http://localhost:3000/ipfs/${cid}/`),
        nativeURL: new URL(`ipfs://${cid}/`)
      })
    })

    it('should parse IPFS request with gateway in the URL', () => {
      const cid = 'bafyaaaa'

      expect(parseRequest(new URL(`http://localhost:3000/ipfs/${cid}`), new URL('http://localhost:3000'))).to.deep.equal({
        protocol: 'ipfs',
        type: 'path',
        cid: CID.parse(cid),
        subdomainURL: new URL(`http://${cid}.ipfs.localhost:3000`),
        pathURL: new URL(`http://localhost:3000/ipfs/${cid}/`),
        nativeURL: new URL(`ipfs://${cid}/`)
      })
    })

    it('should parse IPFS request with gateway and a path', () => {
      const cid = 'bafyaaaa'
      const path = '/foo/bar/baz.txt'

      expect(parseRequest(new URL(`http://example.com:8000/ipfs/${cid}${path}`), new URL('http://localhost:3000'))).to.deep.equal({
        protocol: 'ipfs',
        type: 'path',
        cid: CID.parse(cid),
        subdomainURL: new URL(`http://${cid}.ipfs.localhost:3000${path}`),
        pathURL: new URL(`http://localhost:3000/ipfs/${cid}${path}`),
        nativeURL: new URL(`ipfs://${cid}${path}`)
      })
    })

    it('should parse IPNS request with RSA peerID encoded as base36 CID', async () => {
      const keyPair = await generateKeyPair('RSA')
      const peerId = peerIdFromPrivateKey(keyPair)

      expect(parseRequest(new URL(`http://localhost:3000/ipns/${peerId.toCID().toString(base36)}`), new URL('http://localhost:3000'))).to.deep.equal({
        protocol: 'ipns',
        type: 'path',
        peerId: peerIdFromString(peerId.toString()),
        subdomainURL: new URL(`http://${peerId.toCID().toString(base36)}.ipns.localhost:3000`),
        pathURL: new URL(`http://localhost:3000/ipns/${peerId.toCID().toString(base36)}/`),
        nativeURL: new URL(`ipns://${peerId.toCID().toString(base36)}/`)
      })
    })

    it('should parse IPNS request with Ed25519 peerID encoded as base36 CID', async () => {
      const keyPair = await generateKeyPair('Ed25519')
      const peerId = peerIdFromPrivateKey(keyPair)

      expect(parseRequest(new URL(`http://localhost:3000/ipns/${peerId.toCID().toString(base36)}`), new URL('http://localhost:3000'))).to.deep.equal({
        protocol: 'ipns',
        type: 'path',
        peerId: peerIdFromString(peerId.toString()),
        subdomainURL: new URL(`http://${peerId.toCID().toString(base36)}.ipns.localhost:3000`),
        pathURL: new URL(`http://localhost:3000/ipns/${peerId.toCID().toString(base36)}/`),
        nativeURL: new URL(`ipns://${peerId.toCID().toString(base36)}/`)
      })
    })

    it('should parse IPNS request with secp256k1 peerID encoded as base36 CID', async () => {
      const keyPair = await generateKeyPair('secp256k1')
      const peerId = peerIdFromPrivateKey(keyPair)

      expect(parseRequest(new URL(`http://localhost:3000/ipns/${peerId.toCID().toString(base36)}`), new URL('http://localhost:3000'))).to.deep.equal({
        protocol: 'ipns',
        type: 'path',
        peerId: peerIdFromString(peerId.toString()),
        subdomainURL: new URL(`http://${peerId.toCID().toString(base36)}.ipns.localhost:3000`),
        pathURL: new URL(`http://localhost:3000/ipns/${peerId.toCID().toString(base36)}/`),
        nativeURL: new URL(`ipns://${peerId.toCID().toString(base36)}/`)
      })
    })
  })

  describe('native requests', () => {
    it('should parse IPFS request with base32 CIDv1', () => {
      const cid = 'bafyaaaa'

      expect(parseRequest(new URL(`ipfs://${cid}`), new URL('http://localhost:3000'))).to.deep.equal({
        protocol: 'ipfs',
        type: 'native',
        cid: CID.parse(cid),
        subdomainURL: new URL(`http://${cid}.ipfs.localhost:3000`),
        pathURL: new URL(`http://localhost:3000/ipfs/${cid}`),
        nativeURL: new URL(`ipfs://${cid}`)
      })
    })

    it('should parse IPFS request with CIDv0', () => {
      const cid = CID.parse('QmbQDovX7wRe9ek7u6QXe9zgCXkTzoUSsTFJEkrYV1HrVR')

      expect(parseRequest(new URL(`ipfs://${cid}`), new URL('http://localhost:3000'))).to.deep.equal({
        protocol: 'ipfs',
        type: 'native',
        cid,
        subdomainURL: new URL(`http://${cid.toV1().toString(base32)}.ipfs.localhost:3000`),
        pathURL: new URL(`http://localhost:3000/ipfs/${cid}`),
        nativeURL: new URL(`ipfs://${cid}`)
      })
    })

    it('should parse IPFS request with base32 CIDv1 with a path', () => {
      const cid = 'bafyaaaa'
      const path = '/foo/bar/baz.txt'

      expect(parseRequest(new URL(`ipfs://${cid}${path}`), new URL('http://localhost:3000'))).to.deep.equal({
        protocol: 'ipfs',
        type: 'native',
        cid: CID.parse(cid),
        subdomainURL: new URL(`http://${cid}.ipfs.localhost:3000${path}`),
        pathURL: new URL(`http://localhost:3000/ipfs/${cid}${path}`),
        nativeURL: new URL(`ipfs://${cid}${path}`)
      })
    })

    it('should parse IPNS request with RSA peerID encoded as base36 CID', async () => {
      const keyPair = await generateKeyPair('RSA')
      const peerId = peerIdFromPrivateKey(keyPair)

      expect(parseRequest(new URL(`ipns://${peerId.toCID().toString(base36)}`), new URL('http://localhost:3000'))).to.deep.equal({
        protocol: 'ipns',
        type: 'native',
        peerId: peerIdFromString(peerId.toString()),
        subdomainURL: new URL(`http://${peerId.toCID().toString(base36)}.ipns.localhost:3000`),
        pathURL: new URL(`http://localhost:3000/ipns/${peerId.toCID().toString(base36)}`),
        nativeURL: new URL(`ipns://${peerId.toCID().toString(base36)}`)
      })
    })

    it('should parse IPNS request with Ed25519 peerID encoded as base36 CID', async () => {
      const keyPair = await generateKeyPair('Ed25519')
      const peerId = peerIdFromPrivateKey(keyPair)

      expect(parseRequest(new URL(`ipns://${peerId.toCID().toString(base36)}`), new URL('http://localhost:3000'))).to.deep.equal({
        protocol: 'ipns',
        type: 'native',
        peerId: peerIdFromString(peerId.toString()),
        subdomainURL: new URL(`http://${peerId.toCID().toString(base36)}.ipns.localhost:3000`),
        pathURL: new URL(`http://localhost:3000/ipns/${peerId.toCID().toString(base36)}`),
        nativeURL: new URL(`ipns://${peerId.toCID().toString(base36)}`)
      })
    })

    it('should parse IPNS request with secp256k1 peerID encoded as base36 CID', async () => {
      const keyPair = await generateKeyPair('secp256k1')
      const peerId = peerIdFromPrivateKey(keyPair)

      expect(parseRequest(new URL(`ipns://${peerId.toCID().toString(base36)}`), new URL('http://localhost:3000'))).to.deep.equal({
        protocol: 'ipns',
        type: 'native',
        peerId: peerIdFromString(peerId.toString()),
        subdomainURL: new URL(`http://${peerId.toCID().toString(base36)}.ipns.localhost:3000`),
        pathURL: new URL(`http://localhost:3000/ipns/${peerId.toCID().toString(base36)}`),
        nativeURL: new URL(`ipns://${peerId.toCID().toString(base36)}`)
      })
    })

    it('should parse DNSLink request', async () => {
      const domain = 'test-domain.example.com'

      expect(parseRequest(new URL(`ipns://${domain}`), new URL('http://localhost:3000'))).to.deep.equal({
        protocol: 'dnslink',
        type: 'native',
        domain,
        subdomainURL: new URL(`http://${dnsLinkLabelEncoder(domain)}.ipns.localhost:3000`),
        pathURL: new URL(`http://localhost:3000/ipns/${domain}`),
        nativeURL: new URL(`ipns://${domain}`)
      })
    })

    it('should parse DNSLink request with path', async () => {
      const domain = 'test-domain.example.com'
      const path = '/foo/bar.txt'

      expect(parseRequest(new URL(`ipns://${domain}${path}`), new URL('http://localhost:3000'))).to.deep.equal({
        protocol: 'dnslink',
        type: 'native',
        domain,
        subdomainURL: new URL(`http://${dnsLinkLabelEncoder(domain)}.ipns.localhost:3000${path}`),
        pathURL: new URL(`http://localhost:3000/ipns/${domain}${path}`),
        nativeURL: new URL(`ipns://${domain}${path}`)
      })
    })
  })

  describe('IPFS/IPNS path requests', () => {
    it('should parse IPFS request with base32 CIDv1', () => {
      const cid = 'bafyaaaa'

      expect(parseRequest(`/ipfs/${cid}`, new URL('http://localhost:3000'))).to.deep.equal({
        protocol: 'ipfs',
        type: 'native',
        cid: CID.parse(cid),
        subdomainURL: new URL(`http://${cid}.ipfs.localhost:3000`),
        pathURL: new URL(`http://localhost:3000/ipfs/${cid}`),
        nativeURL: new URL(`ipfs://${cid}`)
      })
    })

    it('should parse IPFS request with CIDv0', () => {
      const cid = CID.parse('QmbQDovX7wRe9ek7u6QXe9zgCXkTzoUSsTFJEkrYV1HrVR')

      expect(parseRequest(`/ipfs/${cid}`, new URL('http://localhost:3000'))).to.deep.equal({
        protocol: 'ipfs',
        type: 'native',
        cid,
        subdomainURL: new URL(`http://${cid.toV1().toString(base32)}.ipfs.localhost:3000`),
        pathURL: new URL(`http://localhost:3000/ipfs/${cid}`),
        nativeURL: new URL(`ipfs://${cid}`)
      })
    })

    it('should parse IPFS request with base32 CIDv1 with a path', () => {
      const cid = 'bafyaaaa'
      const path = '/foo/bar/baz.txt'

      expect(parseRequest(`/ipfs/${cid}${path}`, new URL('http://localhost:3000'))).to.deep.equal({
        protocol: 'ipfs',
        type: 'native',
        cid: CID.parse(cid),
        subdomainURL: new URL(`http://${cid}.ipfs.localhost:3000${path}`),
        pathURL: new URL(`http://localhost:3000/ipfs/${cid}${path}`),
        nativeURL: new URL(`ipfs://${cid}${path}`)
      })
    })

    it('should parse IPNS request with RSA peerID encoded as base36 CID', async () => {
      const keyPair = await generateKeyPair('RSA')
      const peerId = peerIdFromPrivateKey(keyPair)

      expect(parseRequest(`/ipns/${peerId.toCID().toString(base36)}`, new URL('http://localhost:3000'))).to.deep.equal({
        protocol: 'ipns',
        type: 'native',
        peerId: peerIdFromString(peerId.toString()),
        subdomainURL: new URL(`http://${peerId.toCID().toString(base36)}.ipns.localhost:3000`),
        pathURL: new URL(`http://localhost:3000/ipns/${peerId.toCID().toString(base36)}`),
        nativeURL: new URL(`ipns://${peerId.toCID().toString(base36)}`)
      })
    })

    it('should parse IPNS request with Ed25519 peerID encoded as base36 CID', async () => {
      const keyPair = await generateKeyPair('Ed25519')
      const peerId = peerIdFromPrivateKey(keyPair)

      expect(parseRequest(`/ipns/${peerId.toCID().toString(base36)}`, new URL('http://localhost:3000'))).to.deep.equal({
        protocol: 'ipns',
        type: 'native',
        peerId: peerIdFromString(peerId.toString()),
        subdomainURL: new URL(`http://${peerId.toCID().toString(base36)}.ipns.localhost:3000`),
        pathURL: new URL(`http://localhost:3000/ipns/${peerId.toCID().toString(base36)}`),
        nativeURL: new URL(`ipns://${peerId.toCID().toString(base36)}`)
      })
    })

    it('should parse IPNS request with secp256k1 peerID encoded as base36 CID', async () => {
      const keyPair = await generateKeyPair('secp256k1')
      const peerId = peerIdFromPrivateKey(keyPair)

      expect(parseRequest(`/ipns/${peerId.toCID().toString(base36)}`, new URL('http://localhost:3000'))).to.deep.equal({
        protocol: 'ipns',
        type: 'native',
        peerId: peerIdFromString(peerId.toString()),
        subdomainURL: new URL(`http://${peerId.toCID().toString(base36)}.ipns.localhost:3000`),
        pathURL: new URL(`http://localhost:3000/ipns/${peerId.toCID().toString(base36)}`),
        nativeURL: new URL(`ipns://${peerId.toCID().toString(base36)}`)
      })
    })

    it('should parse DNSLink request', async () => {
      const domain = 'test-domain.example.com'

      expect(parseRequest(`/ipns/${domain}`, new URL('http://localhost:3000'))).to.deep.equal({
        protocol: 'dnslink',
        type: 'native',
        domain,
        subdomainURL: new URL(`http://${dnsLinkLabelEncoder(domain)}.ipns.localhost:3000`),
        pathURL: new URL(`http://localhost:3000/ipns/${domain}`),
        nativeURL: new URL(`ipns://${domain}`)
      })
    })

    it('should parse DNSLink request with path', async () => {
      const domain = 'test-domain.example.com'
      const path = '/foo/bar.txt'

      expect(parseRequest(`/ipns/${domain}${path}`, new URL('http://localhost:3000'))).to.deep.equal({
        protocol: 'dnslink',
        type: 'native',
        domain,
        subdomainURL: new URL(`http://${dnsLinkLabelEncoder(domain)}.ipns.localhost:3000${path}`),
        pathURL: new URL(`http://localhost:3000/ipns/${domain}${path}`),
        nativeURL: new URL(`ipns://${domain}${path}`)
      })
    })
  })

  describe('internal requests', () => {
    it('should parse root request', () => {
      expect(parseRequest(new URL('http://localhost:3000'), new URL('http://localhost:3000'))).to.deep.equal({
        type: 'internal',
        url: new URL('http://localhost:3000')
      })
    })

    it('should parse root request with trailing slash', () => {
      expect(parseRequest(new URL('http://localhost:3000/'), new URL('http://localhost:3000'))).to.deep.equal({
        type: 'internal',
        url: new URL('http://localhost:3000/')
      })
    })

    it('should parse root request with index file', () => {
      expect(parseRequest(new URL('http://localhost:3000/index.html'), new URL('http://localhost:3000'))).to.deep.equal({
        type: 'internal',
        url: new URL('http://localhost:3000/index.html')
      })
    })

    it('should parse root request with hash', () => {
      expect(parseRequest(new URL('http://localhost:3000#helia-sw-config'), new URL('http://localhost:3000'))).to.deep.equal({
        type: 'internal',
        url: new URL('http://localhost:3000#helia-sw-config')
      })
    })

    it('should parse uri router url', () => {
      expect(parseRequest(new URL(`http://localhost:3000/ipfs?uri=${encodeURIComponent('http://bafyaaaa.ipfs.localhost:3000')}`), new URL('http://localhost:3000'))).to.deep.equal({
        type: 'internal',
        url: new URL(`http://localhost:3000/ipfs?uri=${encodeURIComponent('http://bafyaaaa.ipfs.localhost:3000')}`)
      })
    })
  })

  describe('external requests', () => {
    it('should parse external request', () => {
      expect(parseRequest(new URL('http://example.com'), new URL('http://localhost:3000'))).to.deep.equal({
        type: 'external',
        url: new URL('http://example.com')
      })
    })

    it('should parse external request with ipfs in path', () => {
      expect(parseRequest(new URL('http://example.com/ipfs/hello.png'), new URL('http://localhost:3000'))).to.deep.equal({
        type: 'external',
        url: new URL('http://example.com/ipfs/hello.png')
      })
    })
  })

  // Round-trip the canonical /ipfs/ CID through every multibase from
  // `ipfs multibase list` (kubo) minus identity. Fixtures match those in
  // test/cloudflare/snippets/multibase.spec.ts and were generated with kubo:
  //   ipfs cid format -b=<base> bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi
  describe('multibase coverage on /ipfs/ path', () => {
    const canonical = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
    const canonicalCid = CID.parse(canonical)

    const cases: Array<[string, string]> = [
      ['base2', '0000000010111000000010010001000001100001111000100011100110011111011001000101011111111110100000110110011111001111010011111111101010000111111111100011010111100110100101110110010000101101001100001011100000000000001001011101101110000100101100110100111000011000111011110100101000011100100011010'],
      ['base32', 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'],
      ['base32upper', 'BAFYBEIGDYRZT5SFP7UDM7HU76UH7Y26NF3EFUYLQABF3OCLGTQY55FBZDI'],
      ['base32pad', 'cafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi======'],
      ['base32padupper', 'CAFYBEIGDYRZT5SFP7UDM7HU76UH7Y26NF3EFUYLQABF3OCLGTQY55FBZDI======'],
      ['base16', 'f01701220c3c4733ec8affd06cf9e9ff50ffc6bcd2ec85a6170004bb709669c31de94391a'],
      ['base16upper', 'F01701220C3C4733EC8AFFD06CF9E9FF50FFC6BCD2EC85A6170004BB709669C31DE94391A'],
      ['base36', 'k2jmtxw8rjh1z69c6not3wtdxb0u3urbzhyll1t9jg6ox26dhi5sfi1m'],
      ['base36upper', 'K2JMTXW8RJH1Z69C6NOT3WTDXB0U3URBZHYLL1T9JG6OX26DHI5SFI1M'],
      ['base32hexpad', 't05o14863ohpjti5fvk3cv7kvuk7voqud5r45kobg015re2b6jgott51p38======'],
      ['base32hexpadupper', 'T05O14863OHPJTI5FVK3CV7KVUK7VOQUD5R45KOBG015RE2B6JGOTT51P38======'],
      ['base64url', 'uAXASIMPEcz7Ir_0Gz56f9Q_8a80uyFphcABLtwlmnDHelDka'],
      ['base32hex', 'v05o14863ohpjti5fvk3cv7kvuk7voqud5r45kobg015re2b6jgott51p38'],
      ['base32hexupper', 'V05O14863OHPJTI5FVK3CV7KVUK7VOQUD5R45KOBG015RE2B6JGOTT51P38'],
      ['base58btc', 'zdj7Wic6KcJAfWz1c9o4M6kq9Lwd5BfbxkVafnrojaaGiSFxM'],
      ['base58flickr', 'ZCJ7vHB6jBiaEvZ1B9N4m6KQ9kWC5bEAXKuzEMRNJzzgHrfXm'],
      ['base64urlpad', 'UAXASIMPEcz7Ir_0Gz56f9Q_8a80uyFphcABLtwlmnDHelDka'],
      ['base256emoji', '🚀🪐⭐💻😅❓💎🌈🌸🌚💰💍🌒😵🐶💁🤐🌎👼🙃🙅☺🌚😞🤤⭐🚀😃✈🌕😚🍻💜🐷⚽✌😊']
      // base64 (m) and base64pad (M) are skipped: their alphabets contain
      // '/', which is a path separator in URLs and cannot survive a round
      // trip through the URL parser. The decoders themselves are exercised
      // by the snippet multibase.spec.ts.
    ]

    for (const [name, encoded] of cases) {
      it(`/ipfs/<${name}> resolves to canonical CID`, () => {
        const result = parseRequest(new URL(`http://localhost:3000/ipfs/${encoded}`), new URL('http://localhost:3000'))
        if (result.type !== 'path' || !('cid' in result)) {
          throw new Error(`expected path-IPFS result, got ${JSON.stringify(result)}`)
        }
        expect(result.cid.equals(canonicalCid)).to.equal(true, `${name} did not round-trip`)
        // subdomain URL should always be the canonical base32 label
        expect(result.subdomainURL.host).to.equal(`${canonical}.ipfs.localhost:3000`)
      })
    }
  })

  // Same coverage for /ipns/, asserting the libp2p-key peer ID round-trips.
  describe('multibase coverage on /ipns/ path', () => {
    const canonicalIpns = 'k51qzi5uqu5dlvj2baxnqndepeb86cbk3ng7n3i46uzyxzyqj2xjonzllnv0v8'

    const cases: Array<[string, string]> = [
      ['base32', 'bafzaajaiaejcbzdibmxyzdjbbehgvizh6g5tikvy47mshdy6gwbruvgwvd24seje'],
      ['base32upper', 'BAFZAAJAIAEJCBZDIBMXYZDJBBEHGVIZH6G5TIKVY47MSHDY6GWBRUVGWVD24SEJE'],
      ['base16', 'f0172002408011220e4680b2f8c8d21090e6aa327f1bb342ab8e7d9238f1e35831a54d6a8f5c91124'],
      ['base16upper', 'F0172002408011220E4680B2F8C8D21090E6AA327F1BB342AB8E7D9238F1E35831A54D6A8F5C91124'],
      ['base36', 'k51qzi5uqu5dlvj2baxnqndepeb86cbk3ng7n3i46uzyxzyqj2xjonzllnv0v8'],
      ['base36upper', 'K51QZI5UQU5DLVJ2BAXNQNDEPEB86CBK3NG7N3I46UZYXZYQJ2XJONZLLNV0V8'],
      ['base58btc', 'z5AanNVJCxnWCzDzCerCejh6EdigZJnNfHrJGzTp5TT2moo7mRGhZZu']
      // Other multibases decode to the same libp2p-key bytes, but
      // @libp2p/peer-id rejects forms outside base32/base36/base58btc.
      // Widen the fixture if that upstream constraint relaxes.
    ]

    for (const [name, encoded] of cases) {
      it(`/ipns/<${name}> resolves to canonical libp2p-key`, () => {
        const result = parseRequest(new URL(`http://localhost:3000/ipns/${encoded}`), new URL('http://localhost:3000'))
        if (result.type !== 'path' || !('peerId' in result)) {
          throw new Error(`expected path-IPNS result, got ${JSON.stringify(result)}`)
        }
        expect(result.subdomainURL.host).to.equal(`${canonicalIpns}.ipns.localhost:3000`)
      })
    }
  })
})
