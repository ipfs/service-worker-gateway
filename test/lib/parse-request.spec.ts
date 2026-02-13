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
})
