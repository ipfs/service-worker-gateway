// Tests for the gateway-edge Worker: badbits anchors, shard lookups and the
// hand-off to the installer cache.
//
// Hash vectors are the examples from the compact denylist spec, never
// entries from the real badbits list.
// @see https://specs.ipfs.tech/compact-denylist-format/#double-hash

import { expect } from 'aegir/chai'
import { base32Encode, base36Decode } from '../../../src/cloudflare/snippets/codec.ts'
import { clearShardMemo, createShardStore, denylistAnchors, goneResponse, isDenied, parseExtraHashes, sha256Hex } from '../../../src/cloudflare/workers/gateway-edge/badbits.ts'
import { handle } from '../../../src/cloudflare/workers/gateway-edge/index.ts'
import { buildShards, shardKey } from '../../../src/cloudflare/workers/gateway-edge/shards.ts'
import type { Env } from '../../../src/cloudflare/workers/gateway-edge/index.ts'

// spec example: sha256(`${SPEC_CID}/`) == SPEC_CID_HASH
const SPEC_CID = 'bafybeiefwqslmf6zyyrxodaxx4vwqircuxpza5ri45ws3y5a62ypxti42e'
const SPEC_CID_HASH = 'd9d295bde21f422d471a90f2a37ec53049fdf3e5fa3ee2e8f20e10003da429e7'
// spec example: sha256(`${SPEC_CID}/path`)
const SPEC_PATH_HASH = '3f8b9febd851873b3774b937cce126910699ceac56e72e64b866f8e258d09572'
// spec example: sha256('bad-domain-name.tld/')
const SPEC_DOMAIN_HASH = 'c555c4de78827ba42527dd3dc5398db38d6c0a8c345a88e0158b2d100f317e50'

const ALLOWED_CID = 'bafkreicafxt3zr4cshf7qteztjzl62ouxqrofu647e44wt7s2iaqjn7bra'
const IPNS_KEY = 'k51qzi5uqu5dlxjl6owpco0tn82bed1444cng351cnc48odwnr7e9pmx4nmmkh'

interface FakeKV {
  get(key: string): Promise<string | null>
  reads: string[]
}

function fakeKV (hashes: string[], fail = false): FakeKV {
  const shards = buildShards(hashes)
  const kv: FakeKV = {
    reads: [],
    async get (key) {
      kv.reads.push(key)
      if (fail) {
        throw new Error('KV unavailable')
      }
      const prefix = key.slice(shardKey('').length)
      return shards.get(prefix) ?? null
    }
  }
  return kv
}

function fakeCache (): Pick<Cache, 'match' | 'put'> & { entries: Map<string, string> } {
  const entries = new Map<string, string>()
  return {
    entries,
    async match (req: RequestInfo | URL) {
      const url = req instanceof Request ? req.url : req.toString()
      const value = entries.get(url)
      return value == null ? undefined : new Response(value)
    },
    async put (req: RequestInfo | URL, res: Response) {
      const url = req instanceof Request ? req.url : req.toString()
      entries.set(url, await res.text())
    }
  } as any
}

interface Harness {
  response: Response
  installerCalls: Request[]
  kv: FakeKV
}

async function run (url: string, options: { hashes?: string[], extra?: string, kvFails?: boolean, cache?: Pick<Cache, 'match' | 'put'> } = {}): Promise<Harness> {
  const kv = fakeKV(options.hashes ?? [], options.kvFails)
  const env = { BADBITS: kv, EXTRA_DENY_HASHES: options.extra } as unknown as Env
  const installerCalls: Request[] = []
  const pending: Array<Promise<unknown>> = []
  const response = await handle(new Request(url), env, { waitUntil: p => { pending.push(p) } }, {
    installer: async req => {
      installerCalls.push(req)
      return new Response('installer', { status: 200 })
    },
    cache: options.cache
  })
  await Promise.all(pending)
  return { response, installerCalls, kv }
}

describe('gateway-edge worker', () => {
  beforeEach(() => {
    clearShardMemo()
  })

  describe('sha256Hex', () => {
    it('matches the legacy spec vectors', async () => {
      expect(await sha256Hex(`${SPEC_CID}/`)).to.equal(SPEC_CID_HASH)
      expect(await sha256Hex(`${SPEC_CID}/path`)).to.equal(SPEC_PATH_HASH)
      expect(await sha256Hex('bad-domain-name.tld/')).to.equal(SPEC_DOMAIN_HASH)
    })
  })

  describe('denylistAnchors', () => {
    it('anchors an IPFS host on its CIDv1 base32 root with a trailing slash', () => {
      expect(denylistAnchors(SPEC_CID, 'ipfs', '/')).to.deep.equal([`${SPEC_CID}/`])
    })

    it('adds a path anchor without the trailing slash', () => {
      expect(denylistAnchors(SPEC_CID, 'ipfs', '/path/')).to.deep.equal([`${SPEC_CID}/`, `${SPEC_CID}/path`])
    })

    it('does not add path anchors for shared gateway assets', () => {
      expect(denylistAnchors(SPEC_CID, 'ipfs', '/ipfs-sw-sw.js')).to.deep.equal([`${SPEC_CID}/`])
    })

    it('normalises a CIDv0 label to CIDv1 base32', () => {
      expect(denylistAnchors('QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR', 'ipfs', '/'))
        .to.deep.equal(['bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/'])
    })

    it('returns nothing for an IPFS label that is not a CID', () => {
      expect(denylistAnchors('not-a-cid', 'ipfs', '/')).to.deep.equal([])
    })

    it('anchors an IPNS key on its libp2p-key CIDv1 in base32', () => {
      const expected = 'b' + base32Encode(base36Decode(IPNS_KEY.slice(1)))
      expect(denylistAnchors(IPNS_KEY, 'ipns', '/')).to.deep.equal([`${expected}/`])
    })

    it('anchors a DNSLink host on the decoded domain', () => {
      expect(denylistAnchors('en-wikipedia--on--ipfs-org', 'ipns', '/wiki/')).to.deep.equal(['en.wikipedia-on-ipfs.org/'])
      expect(denylistAnchors('bad--domain--name-tld', 'ipns', '/')).to.deep.equal(['bad-domain-name.tld/'])
    })
  })

  describe('shard store', () => {
    it('reads a shard from KV once, then from the in-isolate memo', async () => {
      const kv = fakeKV([SPEC_CID_HASH])
      const store = createShardStore({ kv, cacheBase: 'https://inbrowser.link' })
      expect(await isDenied([`${SPEC_CID}/`], store)).to.equal(true)
      expect(await isDenied([`${SPEC_CID}/`], store)).to.equal(true)
      expect(kv.reads).to.deep.equal([shardKey(SPEC_CID_HASH.slice(0, 3))])
    })

    it('prefers the Cache API over KV', async () => {
      const cache = fakeCache()
      const prefix = SPEC_CID_HASH.slice(0, 3)
      cache.entries.set(`https://inbrowser.link/__badbits/${prefix}`, SPEC_CID_HASH.slice(3))
      const kv = fakeKV([])
      const store = createShardStore({ kv, cache, cacheBase: 'https://inbrowser.link' })
      expect(await isDenied([`${SPEC_CID}/`], store)).to.equal(true)
      expect(kv.reads).to.deep.equal([])
    })

    it('fills the Cache API from KV, including empty shards', async () => {
      const cache = fakeCache()
      const store = createShardStore({ kv: fakeKV([]), cache, cacheBase: 'https://inbrowser.link' })
      expect(await isDenied([`${ALLOWED_CID}/`], store)).to.equal(false)
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(cache.entries.size).to.equal(1)
    })

    it('re-reads KV once the memo expires', async () => {
      let now = 0
      const kv = fakeKV([SPEC_CID_HASH])
      const store = createShardStore({ kv, cacheBase: 'https://inbrowser.link', now: () => now })
      await store.get('abc')
      now += 301 * 1000
      await store.get('abc')
      expect(kv.reads).to.have.length(2)
    })
  })

  describe('parseExtraHashes', () => {
    it('keeps only well formed sha256 hex digests', () => {
      expect([...parseExtraHashes(` ${SPEC_CID_HASH.toUpperCase()}, nope\n${SPEC_DOMAIN_HASH}`)])
        .to.deep.equal([SPEC_CID_HASH, SPEC_DOMAIN_HASH])
      expect(parseExtraHashes(undefined).size).to.equal(0)
    })
  })

  describe('handle', () => {
    it('answers 410 for a listed IPFS host without calling the installer', async () => {
      const { response, installerCalls } = await run(`https://${SPEC_CID}.ipfs.inbrowser.link/`, { hashes: [SPEC_CID_HASH] })
      expect(response.status).to.equal(410)
      expect(installerCalls).to.have.length(0)
    })

    it('answers 410 for a listed path under an otherwise allowed CID', async () => {
      const { response } = await run(`https://${SPEC_CID}.ipfs.inbrowser.dev/path`, { hashes: [SPEC_PATH_HASH] })
      expect(response.status).to.equal(410)
    })

    it('answers 410 for a listed DNSLink host', async () => {
      const { response } = await run('https://bad--domain--name-tld.ipns.inbrowser.link/', { hashes: [SPEC_DOMAIN_HASH] })
      expect(response.status).to.equal(410)
    })

    it('refuses the shared assets of a listed host too', async () => {
      const { response } = await run(`https://${SPEC_CID}.ipfs.inbrowser.link/ipfs-sw-sw.js`, { hashes: [SPEC_CID_HASH] })
      expect(response.status).to.equal(410)
    })

    it('hands an allowed host to the installer unchanged', async () => {
      const url = `https://${ALLOWED_CID}.ipfs.inbrowser.link/some/path?q=1`
      const { response, installerCalls } = await run(url, { hashes: [SPEC_CID_HASH] })
      expect(response.status).to.equal(200)
      expect(installerCalls.map(r => r.url)).to.deep.equal([url])
    })

    it('does not look anything up for hosts outside the subdomain gateway', async () => {
      const { installerCalls, kv } = await run('https://inbrowser.link/', { hashes: [SPEC_CID_HASH] })
      expect(installerCalls).to.have.length(1)
      expect(kv.reads).to.deep.equal([])
    })

    it('refuses hashes from EXTRA_DENY_HASHES without touching KV', async () => {
      const { response, kv } = await run(`https://${SPEC_CID}.ipfs.inbrowser.dev/`, { extra: SPEC_CID_HASH })
      expect(response.status).to.equal(410)
      expect(kv.reads).to.deep.equal([])
    })

    it('fails open when KV is unavailable', async () => {
      const { response, installerCalls } = await run(`https://${SPEC_CID}.ipfs.inbrowser.link/`, { kvFails: true })
      expect(response.status).to.equal(200)
      expect(installerCalls).to.have.length(1)
    })

    it('marks the 410 as not indexable and briefly cacheable', async () => {
      const res = goneResponse()
      expect(res.headers.get('content-type')).to.equal('text/html; charset=utf-8')
      expect(res.headers.get('x-robots-tag')).to.equal('noindex, nofollow')
      expect(res.headers.get('cache-control')).to.equal('public, max-age=3600')
    })
  })
})
