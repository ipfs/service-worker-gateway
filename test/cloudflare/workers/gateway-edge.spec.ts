// Tests for the gateway-edge Worker: badbits anchors, shard lookups, store
// health reporting and the hand-off to the installer cache.
//
// Hash vectors are the examples from the compact denylist spec, never
// entries from the real badbits list.
// @see https://specs.ipfs.tech/compact-denylist-format/#double-hash

import { expect } from 'aegir/chai'
import { base32Encode, base36Decode } from '../../../src/cloudflare/snippets/codec.ts'
import { MAX_MEMO_SHARDS, SHARD_TTL_S, clearShardMemo, createShardStore, denylistAnchors, gatewaySubpath, goneResponse, isDenied, parseExtraHashes, sha256Hex, shardMemoSize } from '../../../src/cloudflare/workers/gateway-edge/badbits.ts'
import { STALE_AFTER_MS, handle, resetHealthCheck } from '../../../src/cloudflare/workers/gateway-edge/index.ts'
import { STATUS_KEY, buildShards, shardKey } from '../../../src/cloudflare/workers/gateway-edge/shards.ts'
import type { Env } from '../../../src/cloudflare/workers/gateway-edge/index.ts'
import type { SyncStatus } from '../../../src/cloudflare/workers/gateway-edge/shards.ts'

// spec example: sha256(`${SPEC_CID}/`) == SPEC_CID_HASH
const SPEC_CID = 'bafybeiefwqslmf6zyyrxodaxx4vwqircuxpza5ri45ws3y5a62ypxti42e'
const SPEC_CID_HASH = 'd9d295bde21f422d471a90f2a37ec53049fdf3e5fa3ee2e8f20e10003da429e7'
// spec example: sha256(`${SPEC_CID}/path`)
const SPEC_PATH_HASH = '3f8b9febd851873b3774b937cce126910699ceac56e72e64b866f8e258d09572'
// spec example: sha256('bad-domain-name.tld/')
const SPEC_DOMAIN_HASH = 'c555c4de78827ba42527dd3dc5398db38d6c0a8c345a88e0158b2d100f317e50'

const ALLOWED_CID = 'bafkreicafxt3zr4cshf7qteztjzl62ouxqrofu647e44wt7s2iaqjn7bra'
const IPNS_KEY = 'k51qzi5uqu5dlxjl6owpco0tn82bed1444cng351cnc48odwnr7e9pmx4nmmkh'
const NOW = Date.parse('2026-09-30T12:00:00Z')

interface FakeKV {
  get(key: string): Promise<string | null>
  reads: string[]
  values: Map<string, string>
}

function status (overrides: Partial<SyncStatus> = {}): SyncStatus {
  return { etag: '"x"', count: 513017, unenforced: 0, updated: new Date(NOW).toISOString(), checked: new Date(NOW).toISOString(), ...overrides }
}

function fakeKV (hashes: string[], options: { fail?: boolean, status?: SyncStatus | null } = {}): FakeKV {
  const values = new Map<string, string>()
  for (const [prefix, value] of buildShards(hashes)) {
    values.set(shardKey(prefix), value)
  }
  const st = options.status === undefined ? status() : options.status
  if (st != null) {
    values.set(STATUS_KEY, JSON.stringify(st))
  }
  const kv: FakeKV = {
    reads: [],
    values,
    async get (key) {
      kv.reads.push(key)
      if (options.fail === true) {
        throw new Error('KV unavailable')
      }
      return values.get(key) ?? null
    }
  }
  return kv
}

function fakeCache (): Pick<Cache, 'match' | 'put'> & { entries: Map<string, Response> } {
  const entries = new Map<string, Response>()
  return {
    entries,
    async match (req: RequestInfo | URL) {
      const url = req instanceof Request ? req.url : req.toString()
      return entries.get(url)?.clone()
    },
    async put (req: RequestInfo | URL, res: Response) {
      const url = req instanceof Request ? req.url : req.toString()
      entries.set(url, res.clone())
    }
  } as any
}

interface Harness {
  response: Response
  installerCalls: Request[]
  kv: FakeKV
  events: Array<{ event: string, value: number }>
  points: unknown[]
}

interface RunOptions {
  hashes?: string[]
  extra?: string
  kvFails?: boolean
  status?: SyncStatus | null
  cache?: Pick<Cache, 'match' | 'put'>
  now?: number
}

async function run (url: string, options: RunOptions = {}): Promise<Harness> {
  const kv = fakeKV(options.hashes ?? [], { fail: options.kvFails, status: options.status })
  const points: unknown[] = []
  const env = { BADBITS: kv, EXTRA_DENY_HASHES: options.extra, METRICS: { writeDataPoint: (p: unknown) => points.push(p) } } as unknown as Env
  const installerCalls: Request[] = []
  const pending: Array<Promise<unknown>> = []
  const events: Array<{ event: string, value: number }> = []
  const response = await handle(new Request(url), env, { waitUntil: p => { pending.push(p) } }, {
    installer: async req => {
      installerCalls.push(req)
      return new Response('installer', { status: 200 })
    },
    cache: options.cache,
    now: () => options.now ?? NOW,
    log: line => { events.push(JSON.parse(line)) }
  })
  await Promise.all(pending)
  return { response, installerCalls, kv, events, points }
}

describe('gateway-edge worker', () => {
  beforeEach(() => {
    clearShardMemo()
    resetHealthCheck()
  })

  describe('sha256Hex', () => {
    it('matches the legacy spec vectors', async () => {
      expect(await sha256Hex(`${SPEC_CID}/`)).to.equal(SPEC_CID_HASH)
      expect(await sha256Hex(`${SPEC_CID}/path`)).to.equal(SPEC_PATH_HASH)
      expect(await sha256Hex('bad-domain-name.tld/')).to.equal(SPEC_DOMAIN_HASH)
    })
  })

  describe('gatewaySubpath', () => {
    it('decodes each segment and drops empty ones', () => {
      expect(gatewaySubpath('/some%20file/a%2Fb/')).to.equal('some file/a/b')
      expect(gatewaySubpath('//x///y')).to.equal('x/y')
      expect(gatewaySubpath('/')).to.equal('')
    })

    it('keeps a segment that cannot be decoded', () => {
      expect(gatewaySubpath('/bad%E0%A4%A')).to.equal('bad%E0%A4%A')
    })
  })

  describe('denylistAnchors', () => {
    it('anchors an IPFS host on its CIDv1 base32 root with a trailing slash', () => {
      expect(denylistAnchors(SPEC_CID, 'ipfs', '/')).to.deep.equal([`${SPEC_CID}/`])
    })

    it('adds a path anchor without the trailing slash', () => {
      expect(denylistAnchors(SPEC_CID, 'ipfs', '/path/')).to.deep.equal([`${SPEC_CID}/`, `${SPEC_CID}/path`])
    })

    it('hashes the decoded path, as nopfs does', () => {
      expect(denylistAnchors(SPEC_CID, 'ipfs', '/some%20file')).to.deep.equal([`${SPEC_CID}/`, `${SPEC_CID}/some file`])
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

    it('anchors an IPNS key on its libp2p-key CIDv1 in base32, with paths', () => {
      const key = 'b' + base32Encode(base36Decode(IPNS_KEY.slice(1)))
      expect(denylistAnchors(IPNS_KEY, 'ipns', '/')).to.deep.equal([`${key}/`])
      expect(denylistAnchors(IPNS_KEY, 'ipns', '/a/b')).to.deep.equal([`${key}/`, `${key}/a/b`])
    })

    it('anchors a DNSLink host on the decoded domain, with paths', () => {
      expect(denylistAnchors('bad--domain--name-tld', 'ipns', '/')).to.deep.equal(['bad-domain-name.tld/'])
      expect(denylistAnchors('en-wikipedia--on--ipfs-org', 'ipns', '/wiki/Some%20Page'))
        .to.deep.equal(['en.wikipedia-on-ipfs.org/', 'en.wikipedia-on-ipfs.org/wiki/Some Page'])
    })
  })

  describe('shard store', () => {
    it('reads a shard from KV once, then from the in-isolate memo', async () => {
      const kv = fakeKV([SPEC_CID_HASH])
      const store = createShardStore({ kv, cacheBase: 'https://inbrowser.link', now: () => NOW })
      expect(await isDenied([`${SPEC_CID}/`], store)).to.equal(true)
      expect(await isDenied([`${SPEC_CID}/`], store)).to.equal(true)
      expect(kv.reads).to.deep.equal([shardKey(SPEC_CID_HASH.slice(0, 3))])
    })

    it('prefers a fresh Cache API entry over KV', async () => {
      const cache = fakeCache()
      const prefix = SPEC_CID_HASH.slice(0, 3)
      cache.entries.set(`https://inbrowser.link/__badbits/${encodeURIComponent(shardKey(prefix))}`,
        new Response(SPEC_CID_HASH.slice(3), { headers: { 'x-badbits-fetched-at': String(NOW - 1000) } }))
      const kv = fakeKV([])
      const store = createShardStore({ kv, cache, cacheBase: 'https://inbrowser.link', now: () => NOW })
      expect(await isDenied([`${SPEC_CID}/`], store)).to.equal(true)
      expect(kv.reads).to.deep.equal([])
    })

    it('does not let the memo extend a Cache API entry past its KV read time', async () => {
      let now = NOW
      const cache = fakeCache()
      const prefix = SPEC_CID_HASH.slice(0, 3)
      // copied into the cache 100s before, from an empty shard
      cache.entries.set(`https://inbrowser.link/__badbits/${encodeURIComponent(shardKey(prefix))}`,
        new Response('', { headers: { 'x-badbits-fetched-at': String(NOW - 100_000) } }))
      const kv = fakeKV([SPEC_CID_HASH])
      const store = createShardStore({ kv, cache, cacheBase: 'https://inbrowser.link', now: () => now })
      expect(await isDenied([`${SPEC_CID}/`], store)).to.equal(false)
      // 21s later the entry is SHARD_TTL_S old: it must be re-read from KV
      now += (SHARD_TTL_S - 100 + 1) * 1000
      expect(await isDenied([`${SPEC_CID}/`], store)).to.equal(true)
      expect(kv.reads).to.have.length(1)
    })

    it('treats an expired Cache API entry as a miss', async () => {
      const cache = fakeCache()
      const prefix = SPEC_CID_HASH.slice(0, 3)
      cache.entries.set(`https://inbrowser.link/__badbits/${encodeURIComponent(shardKey(prefix))}`,
        new Response('', { headers: { 'x-badbits-fetched-at': String(NOW - (SHARD_TTL_S + 1) * 1000) } }))
      const kv = fakeKV([SPEC_CID_HASH])
      const store = createShardStore({ kv, cache, cacheBase: 'https://inbrowser.link', now: () => NOW })
      expect(await isDenied([`${SPEC_CID}/`], store)).to.equal(true)
    })

    it('fills the Cache API from KV with its read time', async () => {
      const cache = fakeCache()
      const store = createShardStore({ kv: fakeKV([]), cache, cacheBase: 'https://inbrowser.link', now: () => NOW })
      expect(await isDenied([`${ALLOWED_CID}/`], store)).to.equal(false)
      await new Promise(resolve => setTimeout(resolve, 0))
      const [entry] = [...cache.entries.values()]
      expect(entry.headers.get('x-badbits-fetched-at')).to.equal(String(NOW))
    })

    it('bounds the memo', async () => {
      const store = createShardStore({ kv: fakeKV([]), cacheBase: 'https://inbrowser.link', now: () => NOW })
      for (let i = 0; i < MAX_MEMO_SHARDS + 50; i++) {
        await store.get(i.toString(16).padStart(3, '0'))
      }
      expect(shardMemoSize()).to.equal(MAX_MEMO_SHARDS)
    })

    it('reads the sync status, or null when never synced', async () => {
      expect(await createShardStore({ kv: fakeKV([]), cacheBase: 'https://a.b' }).status()).to.deep.equal(status())
      clearShardMemo()
      expect(await createShardStore({ kv: fakeKV([], { status: null }), cacheBase: 'https://a.b' }).status()).to.equal(null)
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
    it('answers 410 for a listed IPFS host without calling the installer, and reports it', async () => {
      const { response, installerCalls, events, points } = await run(`https://${SPEC_CID}.ipfs.inbrowser.link/`, { hashes: [SPEC_CID_HASH] })
      expect(response.status).to.equal(410)
      expect(installerCalls).to.have.length(0)
      expect(events.map(e => e.event)).to.include('badbits_blocked')
      expect(points).to.have.length(1)
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

    it('hands an allowed host to the installer unchanged, reporting nothing', async () => {
      const url = `https://${ALLOWED_CID}.ipfs.inbrowser.link/some/path?q=1`
      const { response, installerCalls, events } = await run(url, { hashes: [SPEC_CID_HASH] })
      expect(response.status).to.equal(200)
      expect(installerCalls.map(r => r.url)).to.deep.equal([url])
      expect(events).to.deep.equal([])
    })

    it('does not look anything up for hosts outside the subdomain gateway', async () => {
      const { installerCalls, kv } = await run('https://inbrowser.link/', { hashes: [SPEC_CID_HASH] })
      expect(installerCalls).to.have.length(1)
      expect(kv.reads).to.deep.equal([])
    })

    it('refuses hashes from EXTRA_DENY_HASHES', async () => {
      const { response } = await run(`https://${SPEC_CID}.ipfs.inbrowser.dev/`, { extra: SPEC_CID_HASH })
      expect(response.status).to.equal(410)
    })

    it('fails open when KV is unavailable, and reports it', async () => {
      const { response, installerCalls, events } = await run(`https://${SPEC_CID}.ipfs.inbrowser.link/`, { kvFails: true })
      expect(response.status).to.equal(200)
      expect(installerCalls).to.have.length(1)
      expect(events.filter(e => e.event === 'badbits_lookup_error')).to.have.length(2)
    })

    it('reports a store that was never synced', async () => {
      const { response, events } = await run(`https://${ALLOWED_CID}.ipfs.inbrowser.link/`, { status: null })
      expect(response.status).to.equal(200)
      expect(events.map(e => e.event)).to.deep.equal(['badbits_store_missing'])
    })

    it('reports a store whose sync has stopped', async () => {
      const checked = new Date(NOW - STALE_AFTER_MS - 60_000).toISOString()
      const { events } = await run(`https://${ALLOWED_CID}.ipfs.inbrowser.link/`, { status: status({ checked }) })
      expect(events).to.have.length(1)
      expect(events[0].event).to.equal('badbits_store_stale')
      expect(events[0].value).to.equal(Math.round((STALE_AFTER_MS + 60_000) / 1000))
    })

    it('does not report a store synced within the threshold', async () => {
      const checked = new Date(NOW - STALE_AFTER_MS + 60_000).toISOString()
      const { events } = await run(`https://${ALLOWED_CID}.ipfs.inbrowser.link/`, { status: status({ checked }) })
      expect(events).to.deep.equal([])
    })

    it('checks store health at most once a minute per isolate', async () => {
      await run(`https://${ALLOWED_CID}.ipfs.inbrowser.link/`, { status: null })
      clearShardMemo()
      const second = await run(`https://${ALLOWED_CID}.ipfs.inbrowser.link/`, { status: null, now: NOW + 30_000 })
      expect(second.events).to.deep.equal([])
      const third = await run(`https://${ALLOWED_CID}.ipfs.inbrowser.link/`, { status: null, now: NOW + 61_000 })
      expect(third.events.map(e => e.event)).to.deep.equal(['badbits_store_missing'])
    })

    it('marks the 410 as not indexable and briefly cacheable', async () => {
      const res = goneResponse()
      expect(res.headers.get('content-type')).to.equal('text/html; charset=utf-8')
      expect(res.headers.get('x-robots-tag')).to.equal('noindex, nofollow')
      expect(res.headers.get('cache-control')).to.equal('public, max-age=3600')
    })
  })
})
