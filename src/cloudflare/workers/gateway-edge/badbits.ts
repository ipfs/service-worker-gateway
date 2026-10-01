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
import { SHARD_PREFIX_LENGTH, STATUS_KEY, shardHas, shardKey } from './shards.ts'
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
}

export interface ShardStore {
  /** raw shard value for `prefix` ('' when absent) */
  get(prefix: string): Promise<string>
  /** the sync's status record, or null when the store has never been synced */
  status(): Promise<SyncStatus | null>
}

interface MemoEntry {
  /** when the value was read from KV */
  fetchedAt: number
  value: string
}

// Raw shard strings kept per isolate, least recently used first. Bounded so
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
  /** without it, stale shards are re-read from KV on the request path */
  waitUntil?(promise: Promise<unknown>): void
  /** a background KV read failed; the stale shard stays in use */
  onRefreshError?(err: unknown): void
  now?(): number
}

/**
 * Reads KV values through three layers: an in-isolate memo, the colo's Cache
 * API (so most lookups never bill a KV read), then KV itself. A value's age
 * counts from when it was read from KV, not from when a layer last copied
 * it, so the layers cannot stack their TTLs.
 *
 * Up to SHARD_TTL_S old a value is used as is. Up to SHARD_MAX_STALE_S old it
 * is still used, and a fresh copy is read from KV in the background. Older,
 * the request waits for KV.
 */
export function createShardStore (options: ShardStoreOptions): ShardStore {
  const now = options.now ?? Date.now

  async function fetchFromKV (memoKey: string, cacheKey: Request, kvKey: string): Promise<string> {
    const fetchedAt = now()
    const value = (await options.kv.get(kvKey)) ?? ''

    if (options.cache != null) {
      const put = options.cache.put(cacheKey, new Response(value, {
        headers: { 'cache-control': `max-age=${SHARD_MAX_STALE_S}`, [FETCHED_AT]: String(fetchedAt) }
      }))
      options.waitUntil?.(put)
    }

    memoSet(memoKey, { fetchedAt, value })
    return value
  }

  async function use (entry: MemoEntry, memoKey: string, cacheKey: Request, kvKey: string): Promise<string> {
    if (now() - entry.fetchedAt < SHARD_TTL_S * 1000) {
      return entry.value
    }

    if (options.waitUntil == null) {
      return fetchFromKV(memoKey, cacheKey, kvKey)
    }

    if (!refreshing.has(memoKey)) {
      refreshing.add(memoKey)
      options.waitUntil(
        fetchFromKV(memoKey, cacheKey, kvKey)
          .catch(err => { options.onRefreshError?.(err) })
          .finally(() => { refreshing.delete(memoKey) })
      )
    }

    return entry.value
  }

  async function read (kvKey: string): Promise<string> {
    const memoKey = `${options.cacheBase}|${kvKey}`
    const cacheKey = new Request(`${options.cacheBase}/__badbits/${encodeURIComponent(kvKey)}`)
    const memoised = memoGet(memoKey, now())

    if (memoised != null) {
      return use(memoised, memoKey, cacheKey, kvKey)
    }

    const cached = await options.cache?.match(cacheKey)

    if (cached != null) {
      const header = Number(cached.headers.get(FETCHED_AT))
      const fetchedAt = Number.isFinite(header) && header > 0 ? header : now()

      if (now() - fetchedAt < SHARD_MAX_STALE_S * 1000) {
        const entry = { fetchedAt, value: await cached.text() }
        memoSet(memoKey, entry)
        return use(entry, memoKey, cacheKey, kvKey)
      }
    }

    return fetchFromKV(memoKey, cacheKey, kvKey)
  }

  return {
    async get (prefix) {
      return read(shardKey(prefix))
    },
    async status () {
      const value = await read(STATUS_KEY)

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
 * Whether any anchor's sha256 is on the list. `extra` holds full sha256 hex
 * digests checked before the shards, for manual blocks and for proving
 * enforcement on staging with a harmless CID.
 */
export async function isDenied (anchors: string[], store: Pick<ShardStore, 'get'>, extra: ReadonlySet<string> = new Set()): Promise<boolean> {
  for (const anchor of anchors) {
    const hash = await sha256Hex(anchor)

    if (extra.has(hash)) {
      return true
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
