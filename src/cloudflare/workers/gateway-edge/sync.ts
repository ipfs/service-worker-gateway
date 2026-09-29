// Syncs badbits.deny into Workers KV as prefix shards. The CLI wrapper is
// .github/scripts/badbits-sync.ts; this module holds the logic so its
// guards can be tested.
//
// Guards, in the order they apply:
//
//   - unchanged ETag: shards and meta are left alone, but `bb:status` is
//     still written so `checked` proves the sync is running
//   - too small: fewer than MIN_ENTRIES, or under MIN_RATIO of the last
//     count, is treated as a bad download and nothing is written
//   - unenforceable entries: legacy entries are still synced, then the run
//     fails so a list-format change cannot go unnoticed
//
// Write order is shards, then `bb:meta`, then `bb:status`. An interrupted
// run leaves the old meta in place, so the next run rewrites whatever did
// not land.

import { MIN_ENTRIES, META_KEY, STATUS_KEY, buildShards, changedPrefixes, parseDenylist, shardKey } from './shards.ts'
import type { SyncStatus } from './shards.ts'

export interface SyncMeta {
  etag: string | null
  count: number
  shards: Record<string, string>
}

export interface SyncOptions {
  /** URL of the denylist */
  listUrl: string
  /** `https://api.cloudflare.com/client/v4/accounts/<id>/storage/kv/namespaces/<id>` */
  kvBase: string
  token: string
  /** write even if the ETag is unchanged or the list looks too small */
  force?: boolean
  /** rewrite every shard regardless of stored digests, to heal drift */
  full?: boolean
  /** smallest believable list, defaults to MIN_ENTRIES */
  minEntries?: number
  fetch?: typeof globalThis.fetch
  now?(): Date
  log?(message: string): void
}

export interface SyncResult {
  outcome: 'unchanged' | 'synced'
  count: number
  written: number
  unenforced: number
}

/** badbits only ever grows; a much smaller list means a bad download */
export const MIN_RATIO = 0.9
const BULK_LIMIT = 10_000

export class UnenforcedEntriesError extends Error {
  constructor (count: number) {
    super(`${count} denylist entries are not legacy double-hashes and are NOT enforced at the edge; legacy entries were synced`)
    this.name = 'UnenforcedEntriesError'
  }
}

async function digest (value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))

  return [...new Uint8Array(bytes)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Throws if a freshly downloaded list is too small to be believed: below an
 * absolute floor (catches a truncated first download, when there is no
 * previous count) or well below the last synced count.
 */
export function assertPlausibleSize (count: number, previousCount: number | undefined, minEntries: number = MIN_ENTRIES): void {
  if (count < minEntries) {
    throw new Error(`list has ${count} entries, below the ${minEntries} floor; refusing to sync (force to override)`)
  }

  if (previousCount != null && count < previousCount * MIN_RATIO) {
    throw new Error(`list shrank from ${previousCount} to ${count} entries; refusing to sync (force to override)`)
  }
}

interface KVClient {
  readJSON<T>(key: string): Promise<T | null>
  bulkPut(entries: Array<{ key: string, value: string }>): Promise<void>
}

function kvClient (kvBase: string, token: string, doFetch: typeof globalThis.fetch): KVClient {
  const auth = { Authorization: `Bearer ${token}` }
  const options = { kvBase }

  async function readJSON<T> (key: string): Promise<T | null> {
    const res = await doFetch(`${options.kvBase}/values/${encodeURIComponent(key)}`, { headers: auth })

    if (res.status === 404) {
      return null
    }

    if (!res.ok) {
      throw new Error(`reading ${key} failed: ${res.status} ${await res.text()}`)
    }

    return await res.json() as T
  }

  async function bulkPut (entries: Array<{ key: string, value: string }>): Promise<void> {
    for (let i = 0; i < entries.length; i += BULK_LIMIT) {
      const res = await doFetch(`${options.kvBase}/bulk`, {
        method: 'PUT',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify(entries.slice(i, i + BULK_LIMIT))
      })
      const body = await res.json() as { success: boolean, errors: unknown[] }

      if (!res.ok || !body.success) {
        throw new Error(`bulk write failed: ${res.status} ${JSON.stringify(body.errors)}`)
      }
    }
  }

  return { readJSON, bulkPut }
}

/** digest of every shard, and the prefixes a run must write */
async function planWrites (shards: Map<string, string>, previous: SyncMeta | null, full: boolean): Promise<{ digests: Record<string, string>, prefixes: string[] }> {
  const digests: Record<string, string> = {}

  for (const [prefix, value] of shards) {
    digests[prefix] = await digest(value)
  }

  const before = previous?.shards ?? {}
  const prefixes = full
    ? [...new Set([...Object.keys(before), ...shards.keys()])].sort()
    : changedPrefixes(before, digests)

  return { digests, prefixes }
}

export async function runSync (options: SyncOptions): Promise<SyncResult> {
  const doFetch = options.fetch ?? globalThis.fetch
  const now = options.now ?? (() => new Date())
  const log = options.log ?? (() => {})
  const force = options.force === true
  const full = options.full === true
  const { readJSON, bulkPut } = kvClient(options.kvBase, options.token, doFetch)

  const [previous, previousStatus] = await Promise.all([
    readJSON<SyncMeta>(META_KEY),
    readJSON<SyncStatus>(STATUS_KEY)
  ])

  const res = await doFetch(options.listUrl)

  if (!res.ok) {
    throw new Error(`downloading ${options.listUrl} failed: ${res.status}`)
  }

  const etag = res.headers.get('etag')
  const checked = now().toISOString()

  if (!force && !full && previousStatus != null && previous?.etag != null && etag === previous.etag) {
    await res.body?.cancel()
    await bulkPut([{ key: STATUS_KEY, value: JSON.stringify({ ...previousStatus, checked } satisfies SyncStatus) }])
    log(`list unchanged (${etag}), status refreshed`)

    if (previousStatus.unenforced > 0) {
      throw new UnenforcedEntriesError(previousStatus.unenforced)
    }

    return { outcome: 'unchanged', count: previousStatus.count, written: 0, unenforced: previousStatus.unenforced }
  }

  const { hashes, skipped } = parseDenylist(await res.text())

  if (!force) {
    assertPlausibleSize(hashes.length, previous?.count, options.minEntries)
  }

  const shards = buildShards(hashes)
  const { digests, prefixes } = await planWrites(shards, previous, full)

  await bulkPut(prefixes.map(prefix => ({ key: shardKey(prefix), value: shards.get(prefix) ?? '' })))
  await bulkPut([{ key: META_KEY, value: JSON.stringify({ etag, count: hashes.length, shards: digests } satisfies SyncMeta) }])

  const updated = prefixes.length > 0 || previousStatus == null ? checked : previousStatus.updated
  const status: SyncStatus = { etag, count: hashes.length, unenforced: skipped, updated, checked }
  await bulkPut([{ key: STATUS_KEY, value: JSON.stringify(status) }])

  log(`synced ${hashes.length} entries (${etag}): ${prefixes.length} of ${shards.size} shards written${full ? ' (full)' : ''}`)

  if (skipped > 0) {
    throw new UnenforcedEntriesError(skipped)
  }

  return { outcome: 'synced', count: hashes.length, written: prefixes.length, unenforced: skipped }
}
