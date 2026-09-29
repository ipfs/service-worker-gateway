// Badbits lookups for subdomain gateway hosts.
//
// Rainbow enforced badbits for inbrowser.* by answering 410 for any
// `<cid>.ipfs.` / `<name>.ipns.` host whose root was on the list. When the
// subdomains moved to Cloudflare Pages that enforcement went with it, since
// Pages serves the installer for any hostname. This module restores the same
// check at the edge.
//
// Anchors follow the legacy double-hash rules of the compact denylist spec:
//
//   /ipfs/CID        sha256(`${cidV1Base32}/`)
//   /ipfs/CID/PATH   sha256(`${cidV1Base32}/PATH`), no trailing slash
//   /ipns/KEY        sha256(`${libp2pKeyCidV1Base32}/`)
//   /ipns/DOMAIN     sha256(`${domain}/`)
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
import { SHARD_PREFIX_LENGTH, parseShard, shardKey } from './shards.ts'

export type Namespace = 'ipfs' | 'ipns'

/** how long a shard is reused before KV is asked again */
export const SHARD_TTL_S = 300

/**
 * The strings whose sha256 may appear on the denylist for a request to
 * `<label>.<namespace>.<gateway>` with the given path.
 */
export function denylistAnchors (label: string, namespace: Namespace, pathname: string): string[] {
  if (namespace === 'ipfs') {
    let root: string

    try {
      const cid = parseCID(label)
      root = 'b' + base32Encode(cid.version === 0 ? cidV1Bytes(cid.codec, cid.multihash) : cid.raw)
    } catch {
      return []
    }

    const anchors = [`${root}/`]
    const path = pathname.replace(/\/+$/, '')

    // gateway assets are the same on every host, a path anchor for them can
    // never match anything specific to this CID
    if (path !== '' && !path.startsWith('/ipfs-sw-')) {
      anchors.push(`${root}${path}`)
    }

    return anchors
  }

  try {
    const cid = parseCID(label)
    const key = cid.version === 0 ? cidV1Bytes(CODE_LIBP2P_KEY, cid.multihash) : cid.raw

    return [`b${base32Encode(key)}/`]
  } catch {
    return [`${dnsLinkDecode(label)}/`]
  }
}

export async function sha256Hex (value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))

  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
}

export interface ShardStore {
  /** hash suffixes (the part after the shard prefix) listed under `prefix` */
  get(prefix: string): Promise<Set<string>>
}

interface MemoEntry {
  expires: number
  shard: Set<string>
}

// Parsed shards are kept per isolate so a busy host does not re-read and
// re-parse the same ~8 KB value on every request.
const memo = new Map<string, MemoEntry>()

/** the part of a KV binding the store needs */
export interface ShardSource {
  get(key: string): Promise<string | null>
}

export interface ShardStoreOptions {
  kv: ShardSource
  /** Workers Cache API, absent outside the Workers runtime */
  cache?: Pick<Cache, 'match' | 'put'>
  /** base URL for Cache API keys, must be on the Worker's zone */
  cacheBase: string
  waitUntil?(promise: Promise<unknown>): void
  now?(): number
}

/**
 * Reads shards through three layers: an in-isolate memo, the colo's Cache
 * API (so most lookups never bill a KV read), then KV itself.
 */
export function createShardStore (options: ShardStoreOptions): ShardStore {
  const now = options.now ?? Date.now

  return {
    async get (prefix) {
      const memoKey = `${options.cacheBase}|${prefix}`
      const hit = memo.get(memoKey)

      if (hit != null && hit.expires > now()) {
        return hit.shard
      }

      const cacheKey = new Request(`${options.cacheBase}/__badbits/${prefix}`)
      let value: string | null = null
      const cached = await options.cache?.match(cacheKey)

      if (cached != null) {
        value = await cached.text()
      } else {
        value = await options.kv.get(shardKey(prefix))

        if (options.cache != null) {
          const put = options.cache.put(cacheKey, new Response(value ?? '', {
            headers: { 'cache-control': `max-age=${SHARD_TTL_S}` }
          }))
          options.waitUntil?.(put)
        }
      }

      const shard = parseShard(value)
      memo.set(memoKey, { expires: now() + SHARD_TTL_S * 1000, shard })

      return shard
    }
  }
}

/** test hook: forget memoised shards */
export function clearShardMemo (): void {
  memo.clear()
}

/**
 * Whether any anchor's sha256 is on the list. `extra` holds full sha256 hex
 * digests checked before the shards, used to prove enforcement on staging
 * with a harmless CID.
 */
export async function isDenied (anchors: string[], store: ShardStore, extra: ReadonlySet<string> = new Set()): Promise<boolean> {
  for (const anchor of anchors) {
    const hash = await sha256Hex(anchor)

    if (extra.has(hash)) {
      return true
    }

    const shard = await store.get(hash.slice(0, SHARD_PREFIX_LENGTH))

    if (shard.has(hash.slice(SHARD_PREFIX_LENGTH))) {
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
