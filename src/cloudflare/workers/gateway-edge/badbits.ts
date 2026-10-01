// Badbits lookups for subdomain gateway hosts.
//
// Rainbow enforced badbits for inbrowser.* by answering 410 for any
// `<cid>.ipfs.` / `<name>.ipns.` host whose root was on the list. When the
// subdomains moved to Cloudflare Pages that enforcement went with it, since
// Pages serves the installer for any hostname. This module restores the same
// check at the edge.
//
// Anchors follow the legacy double-hash rules of the compact denylist spec,
// the way nopfs (Rainbow's blocker) builds them:
//
//   /ipfs/CID[/PATH]         sha256(`${cidV1Base32}/${path}`)
//   /ipns/KEY[/PATH]         sha256(`${libp2pKeyCidV1Base32}/${path}`)
//   /ipns/DOMAIN[/PATH]      sha256(`${domain}/${path}`)
//
// `path` is the decoded path without leading or trailing slash, empty for
// the root, so a root anchor ends in `/`.
//
// Only the first request for a host reaches the edge. After that the service
// worker answers navigations itself, so path anchors only see the path a
// visitor first landed on. That matches what Rainbow saw.
//
// @see https://specs.ipfs.tech/compact-denylist-format/#double-hash

import { CODE_LIBP2P_KEY } from '../../../ui/pages/multicodec-table.ts'
import { cidV1Bytes, parseCID } from '../../snippets/cid.ts'
import { base32Encode } from '../../snippets/codec.ts'
import { dnsLinkDecode } from '../../snippets/dnslink.ts'
import { INDEX_ENTRY_BYTES, INDEX_KEY, MIN_ENTRIES, SHARD_PREFIX_LENGTH, STATUS_KEY, indexHas, shardHas, shardKey } from './shards.ts'
import type { SyncStatus } from './shards.ts'

export type Namespace = 'ipfs' | 'ipns'

/**
 * How long a shard read from KV is used as is (memo and Cache API combined).
 * Together with KV's own ~60s edge cache and the 5-minute sync, a newly
 * listed CID is refused within about 8 minutes of the list changing.
 */
export const SHARD_TTL_S = 120

/**
 * How long past its KV read a shard may still answer a request while a fresh
 * copy is read in the background. A cold KV read takes 100-300 ms, and with
 * 4,096 shards per colo most requests would wait on one if every copy
 * expired at SHARD_TTL_S. Past this age the request waits for KV.
 */
export const SHARD_MAX_STALE_S = 600

/** parsed shards kept per isolate, ~8 KB each */
export const MAX_MEMO_SHARDS = 512

const FETCHED_AT = 'x-badbits-fetched-at'

/**
 * Decode and normalise a URL path the way a gateway resolves it: segments
 * percent-decoded, empty segments dropped. Undecodable segments are kept as
 * sent rather than dropping the anchor.
 */
export function gatewaySubpath (pathname: string): string {
  return pathname
    .split('/')
    .filter(segment => segment !== '')
    .map(segment => {
      try {
        return decodeURIComponent(segment)
      } catch {
        return segment
      }
    })
    .join('/')
}

/**
 * The strings whose sha256 may appear on the denylist for a request to
 * `<label>.<namespace>.<gateway>` with the given path.
 */
export function denylistAnchors (label: string, namespace: Namespace, pathname: string): string[] {
  let root: string

  try {
    const cid = parseCID(label)

    if (namespace === 'ipfs') {
      root = 'b' + base32Encode(cid.version === 0 ? cidV1Bytes(cid.codec, cid.multihash) : cid.raw)
    } else {
      root = 'b' + base32Encode(cid.version === 0 ? cidV1Bytes(CODE_LIBP2P_KEY, cid.multihash) : cid.raw)
    }
  } catch {
    if (namespace === 'ipfs') {
      return []
    }

    root = dnsLinkDecode(label)
  }

  const anchors = [`${root}/`]
  const subpath = gatewaySubpath(pathname)

  // gateway assets are the same on every host, a path anchor for them can
  // never match anything specific to this root
  if (subpath !== '' && !subpath.startsWith('ipfs-sw-')) {
    anchors.push(`${root}/${subpath}`)
  }

  return anchors
}

export async function sha256Hex (value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))

  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
}

/** the part of a KV binding the store needs */
export interface ShardSource {
  get(key: string): Promise<string | null>
  get(key: string, type: 'arrayBuffer'): Promise<ArrayBuffer | null>
}

export interface ShardStore {
  /** raw shard value for `prefix` ('' when absent) */
  get(prefix: string): Promise<string>
  /**
   * the hash-prefix index, or null when it is missing or implausibly small,
   * in which case every lookup reads its shard
   */
  index(): Promise<Uint8Array | null>
  /** the sync's status record, or null when the store has never been synced */
  status(): Promise<SyncStatus | null>
}

interface MemoEntry {
  /** when the value was read from KV */
  fetchedAt: number
  value: string | Uint8Array
}

// Raw shard strings (and the index) kept per isolate, least recently used first. Bounded so
// a busy isolate cannot fill its memory with shards.
const memo = new Map<string, MemoEntry>()

// memo keys with a background KV read in flight, so a burst of requests on a
// stale shard starts one read, not one each
const refreshing = new Set<string>()

function memoGet (key: string, now: number): MemoEntry | undefined {
  const hit = memo.get(key)

  if (hit == null) {
    return undefined
  }

  memo.delete(key)

  if (now - hit.fetchedAt >= SHARD_MAX_STALE_S * 1000) {
    return undefined
  }

  memo.set(key, hit)
  return hit
}

function memoSet (key: string, entry: MemoEntry): void {
  memo.delete(key)
  memo.set(key, entry)

  while (memo.size > MAX_MEMO_SHARDS) {
    memo.delete(memo.keys().next().value!)
  }
}

export interface ShardStoreOptions {
  kv: ShardSource
  /** Workers Cache API, absent outside the Workers runtime */
  cache?: Pick<Cache, 'match' | 'put'>
  /** base URL for Cache API keys, must be on the Worker's zone */
  cacheBase: string
  /** without it, stale values are re-read on the request path */
  waitUntil?(promise: Promise<unknown>): void
  /** a background read failed; the stale value stays in use */
  onRefreshError?(err: unknown): void
  /** an index with fewer entries is ignored, defaults to MIN_ENTRIES */
  minIndexEntries?: number
  now?(): number
}

interface StoreKey {
  kv: string
  memo: string
  cache: Request
  binary: boolean
}

/**
 * Reads KV values through three layers: an in-isolate memo, the colo's Cache
 * API (so most lookups never bill a KV read), then KV itself. A value's age
 * counts from when it was read from KV, not from when a layer last copied
 * it, so the layers cannot stack their TTLs.
 *
 * Up to SHARD_TTL_S old a value is used as is. Up to SHARD_MAX_STALE_S old it
 * is still used, and a fresh copy is fetched in the background: from the
 * Cache API if another isolate already put one there, otherwise from KV.
 * Older, the request waits for KV.
 */
export function createShardStore (options: ShardStoreOptions): ShardStore {
  const now = options.now ?? Date.now

  function storeKey (kvKey: string, binary: boolean): StoreKey {
    return {
      kv: kvKey,
      memo: `${options.cacheBase}|${kvKey}`,
      cache: new Request(`${options.cacheBase}/__badbits/${encodeURIComponent(kvKey)}`),
      binary
    }
  }

  async function fromKV (key: StoreKey): Promise<string | Uint8Array> {
    const fetchedAt = now()
    const value = key.binary
      ? new Uint8Array((await options.kv.get(key.kv, 'arrayBuffer')) ?? new ArrayBuffer(0))
      : (await options.kv.get(key.kv)) ?? ''

    if (options.cache != null) {
      const put = options.cache.put(key.cache, new Response(value, {
        headers: { 'cache-control': `max-age=${SHARD_MAX_STALE_S}`, [FETCHED_AT]: String(fetchedAt) }
      }))
      options.waitUntil?.(put)
    }

    memoSet(key.memo, { fetchedAt, value })
    return value
  }

  async function fromCache (key: StoreKey): Promise<MemoEntry | undefined> {
    const cached = await options.cache?.match(key.cache)

    if (cached == null) {
      return undefined
    }

    const header = Number(cached.headers.get(FETCHED_AT))
    const fetchedAt = Number.isFinite(header) && header > 0 ? header : now()

    if (now() - fetchedAt >= SHARD_MAX_STALE_S * 1000) {
      return undefined
    }

    const value = key.binary ? new Uint8Array(await cached.arrayBuffer()) : await cached.text()
    return { fetchedAt, value }
  }

  async function refresh (key: StoreKey, stale: MemoEntry): Promise<string | Uint8Array> {
    const cached = await fromCache(key)

    if (cached != null && cached.fetchedAt > stale.fetchedAt && now() - cached.fetchedAt < SHARD_TTL_S * 1000) {
      memoSet(key.memo, cached)
      return cached.value
    }

    return fromKV(key)
  }

  async function use (entry: MemoEntry, key: StoreKey): Promise<string | Uint8Array> {
    if (now() - entry.fetchedAt < SHARD_TTL_S * 1000) {
      return entry.value
    }

    if (options.waitUntil == null) {
      return refresh(key, entry)
    }

    if (!refreshing.has(key.memo)) {
      refreshing.add(key.memo)
      options.waitUntil(
        refresh(key, entry)
          .catch(err => { options.onRefreshError?.(err) })
          .finally(() => { refreshing.delete(key.memo) })
      )
    }

    return entry.value
  }

  async function read (key: StoreKey): Promise<string | Uint8Array> {
    const memoised = memoGet(key.memo, now())

    if (memoised != null) {
      return use(memoised, key)
    }

    const cached = await fromCache(key)

    if (cached != null) {
      memoSet(key.memo, cached)
      return use(cached, key)
    }

    return fromKV(key)
  }

  return {
    async get (prefix) {
      return await read(storeKey(shardKey(prefix), false)) as string
    },
    async index () {
      const value = await read(storeKey(INDEX_KEY, true)) as Uint8Array
      const entries = value.byteLength / INDEX_ENTRY_BYTES

      // a truncated or empty index would let listed hashes through
      if (!Number.isInteger(entries) || entries < (options.minIndexEntries ?? MIN_ENTRIES)) {
        return null
      }

      return value
    },
    async status () {
      const value = await read(storeKey(STATUS_KEY, false)) as string

      if (value === '') {
        return null
      }

      try {
        return JSON.parse(value) as SyncStatus
      } catch {
        return null
      }
    }
  }
}

/** test hook: forget memoised values */
export function clearShardMemo (): void {
  memo.clear()
  refreshing.clear()
}

/** test hook: number of memoised values */
export function shardMemoSize (): number {
  return memo.size
}

/**
 * Whether any anchor's sha256 is on the list. The index rules most hashes
 * out without a shard read; without a usable index every shard is read.
 * `extra` holds full sha256 hex digests checked before the shards, for
 * manual blocks and for proving enforcement on staging with a harmless CID.
 */
export async function isDenied (anchors: string[], store: Pick<ShardStore, 'get' | 'index'>, extra: ReadonlySet<string> = new Set()): Promise<boolean> {
  const index = await store.index()

  for (const anchor of anchors) {
    const hash = await sha256Hex(anchor)

    if (extra.has(hash)) {
      return true
    }

    // not in the index: certainly not listed, no shard read needed
    if (index != null && !indexHas(index, hash)) {
      continue
    }

    if (shardHas(await store.get(hash.slice(0, SHARD_PREFIX_LENGTH)), hash.slice(SHARD_PREFIX_LENGTH))) {
      return true
    }
  }

  return false
}

/**
 * Parse a comma or whitespace separated list of sha256 hex digests.
 */
export function parseExtraHashes (value: string | undefined): Set<string> {
  return new Set((value ?? '').split(/[\s,]+/).map(s => s.trim().toLowerCase()).filter(s => /^[0-9a-f]{64}$/.test(s)))
}

export function goneResponse (): Response {
  const body = '<!doctype html><meta charset="utf-8"><title>410 Gone</title>' +
    '<h1>410 Gone</h1>' +
    '<p>This content is blocked under the <a href="https://badbits.dwebops.pub/">Bad Bits</a> denylist.</p>' +
    '<p>To report harmful content, see <a href="https://about.ipfs.io/#reporting-abuse">Reporting Abuse</a>.</p>\n'

  return new Response(body, {
    status: 410,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // entries are never removed from badbits, but keep browser caching
      // short so a mistaken block does not outlive its correction by long
      'cache-control': 'public, max-age=3600',
      'x-robots-tag': 'noindex, nofollow'
    }
  })
}
