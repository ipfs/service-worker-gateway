// Tests for the badbits sync: the guards that keep a bad download, a format
// change or an interrupted run from leaving the edge enforcing less than the
// list says, and the write order that makes interruption safe.

import { expect } from 'aegir/chai'
import { META_KEY, STATUS_KEY, shardKey } from '../../../src/cloudflare/workers/gateway-edge/shards.ts'
import { UnenforcedEntriesError, runSync } from '../../../src/cloudflare/workers/gateway-edge/sync.ts'
import type { SyncStatus } from '../../../src/cloudflare/workers/gateway-edge/shards.ts'
import type { SyncOptions } from '../../../src/cloudflare/workers/gateway-edge/sync.ts'

const LIST_URL = 'https://list.example/badbits.deny'
const KV_BASE = 'https://kv.example/ns'
const T0 = new Date('2026-09-30T12:00:00Z')

function hashes (n: number, offset = 0): string[] {
  return Array.from({ length: n }, (_, i) => (i + offset).toString(16).padStart(64, '0'))
}

function list (entries: string[], extra: string[] = []): string {
  return `name: "test"\n---\n${[...entries.map(h => `//${h}`), ...extra].join('\n')}\n`
}

interface FakeWorld {
  kv: Map<string, string>
  /** keys in the order they were written, one array per bulk call */
  writes: string[][]
  listBody: string
  listEtag: string
  failBulkAfter?: number
  fetch: typeof globalThis.fetch
}

function world (): FakeWorld {
  const w: FakeWorld = {
    kv: new Map(),
    writes: [],
    listBody: '',
    listEtag: '"v1"',
    fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString()
      if (url === LIST_URL) {
        return new Response(w.listBody, { headers: { etag: w.listEtag } })
      }
      if (url.startsWith(`${KV_BASE}/values/`)) {
        const value = w.kv.get(decodeURIComponent(url.slice(`${KV_BASE}/values/`.length)))
        return value == null ? new Response('not found', { status: 404 }) : new Response(value)
      }
      if (url === `${KV_BASE}/bulk` && init?.method === 'PUT') {
        if (w.failBulkAfter != null && w.writes.length >= w.failBulkAfter) {
          return new Response(JSON.stringify({ success: false, errors: ['boom'] }), { status: 500 })
        }
        const items = JSON.parse(init.body as string) as Array<{ key: string, value: string }>
        w.writes.push(items.map(i => i.key))
        for (const item of items) {
          w.kv.set(item.key, item.value)
        }
        return new Response(JSON.stringify({ success: true, errors: [] }))
      }
      return new Response('unexpected', { status: 500 })
    }) as typeof globalThis.fetch
  }
  return w
}

async function sync (w: FakeWorld, options: Partial<SyncOptions> = {}, now = T0): ReturnType<typeof runSync> {
  return runSync({ listUrl: LIST_URL, kvBase: KV_BASE, token: 't', fetch: w.fetch, now: () => now, minEntries: 100, ...options })
}

const statusOf = (w: FakeWorld): SyncStatus => JSON.parse(w.kv.get(STATUS_KEY) ?? 'null')

describe('badbits sync', () => {
  it('writes every shard on the first run, then meta, then status last', async () => {
    const w = world()
    w.listBody = list(hashes(1000))
    const result = await sync(w)
    expect(result).to.include({ outcome: 'synced', count: 1000, unenforced: 0 })
    expect(result.written).to.equal(new Set(hashes(1000).map(h => h.slice(0, 3))).size)
    const order = w.writes.flat()
    expect(order.slice(-2)).to.deep.equal([META_KEY, STATUS_KEY])
    expect(order.slice(0, -2).every(k => k.startsWith('bb:') && k !== META_KEY && k !== STATUS_KEY)).to.equal(true)
    expect(statusOf(w)).to.deep.include({ count: 1000, etag: '"v1"', checked: T0.toISOString(), updated: T0.toISOString() })
  })

  it('skips shards and meta when the ETag is unchanged, but refreshes checked', async () => {
    const w = world()
    w.listBody = list(hashes(1000))
    await sync(w)
    w.writes = []
    const later = new Date(T0.getTime() + 300_000)
    const result = await sync(w, {}, later)
    expect(result.outcome).to.equal('unchanged')
    expect(w.writes).to.deep.equal([[STATUS_KEY]])
    expect(statusOf(w)).to.deep.include({ checked: later.toISOString(), updated: T0.toISOString() })
  })

  it('writes only the shards that changed', async () => {
    const w = world()
    w.listBody = list(hashes(1000))
    await sync(w)
    w.writes = []
    w.listEtag = '"v2"'
    // one new entry in a new prefix, one in an existing prefix
    w.listBody = list([...hashes(1000), 'f'.repeat(64), '000' + 'e'.repeat(61)])
    const result = await sync(w)
    expect(result.written).to.equal(2)
    expect(w.writes.flat()).to.deep.equal([shardKey('000'), shardKey('fff'), META_KEY, STATUS_KEY])
  })

  it('refuses a list below the absolute floor, even on the first run', async () => {
    const w = world()
    w.listBody = list(hashes(99))
    await expect(sync(w)).to.eventually.be.rejectedWith(/below the 100 floor/)
    expect(w.writes).to.deep.equal([])
  })

  it('refuses a list that shrank by more than 10%', async () => {
    const w = world()
    w.listBody = list(hashes(1000))
    await sync(w)
    w.writes = []
    w.listEtag = '"v2"'
    w.listBody = list(hashes(850))
    await expect(sync(w)).to.eventually.be.rejectedWith(/shrank from 1000 to 850/)
    expect(w.writes).to.deep.equal([])
  })

  it('lets force override the size guards', async () => {
    const w = world()
    w.listBody = list(hashes(10))
    const result = await sync(w, { force: true })
    expect(result.count).to.equal(10)
  })

  it('syncs legacy entries, then fails when some entries cannot be enforced', async () => {
    const w = world()
    w.listBody = list(hashes(1000), ['/ipfs/bafybeiefwqslmf6zyyrxodaxx4vwqircuxpza5ri45ws3y5a62ypxti42e'])
    await expect(sync(w)).to.eventually.be.rejectedWith(UnenforcedEntriesError)
    expect(statusOf(w)).to.deep.include({ count: 1000, unenforced: 1 })
    // and keeps failing on unchanged runs until the format is handled
    await expect(sync(w)).to.eventually.be.rejectedWith(UnenforcedEntriesError)
  })

  it('rewrites every shard on a full run, healing out-of-band drift', async () => {
    const w = world()
    w.listBody = list(hashes(1000))
    await sync(w)
    const damaged = shardKey('000')
    w.kv.set(damaged, 'tampered')
    w.writes = []
    await sync(w)
    expect(w.kv.get(damaged)).to.equal('tampered') // an unchanged run cannot see it
    const result = await sync(w, { full: true })
    expect(w.kv.get(damaged)).to.not.equal('tampered')
    expect(result.written).to.equal(new Set(hashes(1000).map(h => h.slice(0, 3))).size)
  })

  it('leaves meta and status untouched when a shard write fails', async () => {
    const w = world()
    w.listBody = list(hashes(1000))
    w.failBulkAfter = 0
    await expect(sync(w)).to.eventually.be.rejectedWith(/bulk write failed/)
    expect(w.kv.has(META_KEY)).to.equal(false)
    expect(w.kv.has(STATUS_KEY)).to.equal(false)
  })

  it('fails when the list cannot be downloaded', async () => {
    const w = world()
    const failing = (async (input: RequestInfo | URL, init?: RequestInit) =>
      input.toString() === LIST_URL ? new Response('down', { status: 503 }) : w.fetch(input, init)) as typeof globalThis.fetch
    await expect(sync(w, { fetch: failing })).to.eventually.be.rejectedWith(/503/)
    expect(w.writes).to.deep.equal([])
  })
})
