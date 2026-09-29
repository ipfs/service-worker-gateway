// Syncs badbits.deny into Workers KV as prefix shards.
//
// Run with: node --experimental-strip-types .github/scripts/badbits-sync.ts
//
// Env:
//   CF_ACCOUNT_ID       Cloudflare account
//   CF_BADBITS_TOKEN    API token with Account > Workers KV Storage > Edit
//   BADBITS_KV_ID       KV namespace id
//   BADBITS_URL         optional, defaults to the dwebops list
//   FORCE               "true" to upload even if the list is unchanged or shrank
//
// Only shards whose contents changed are written. `bb:meta` records the
// list's ETag, entry count and a digest per shard, and is written last, so
// an interrupted run is simply redone by the next one.

import { createHash } from 'node:crypto'
import { META_KEY, buildShards, changedPrefixes, parseDenylist, shardKey } from '../../src/cloudflare/workers/gateway-edge/shards.ts'

interface Meta {
  etag: string | null
  count: number
  updated: string
  shards: Record<string, string>
}

const BULK_LIMIT = 10_000
// badbits only ever grows; a much smaller list means a bad download
const MIN_RATIO = 0.9

const env = (name: string): string => {
  const value = process.env[name]

  if (value == null || value === '') {
    throw new Error(`${name} is not set`)
  }

  return value
}

const accountId = env('CF_ACCOUNT_ID')
const token = env('CF_BADBITS_TOKEN')
const namespaceId = env('BADBITS_KV_ID')
const listUrl = process.env.BADBITS_URL ?? 'https://badbits.dwebops.pub/badbits.deny'
const force = process.env.FORCE === 'true'
const kvBase = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}`
const auth = { Authorization: `Bearer ${token}` }

async function readMeta (): Promise<Meta | null> {
  const res = await fetch(`${kvBase}/values/${encodeURIComponent(META_KEY)}`, { headers: auth })

  if (res.status === 404) {
    return null
  }

  if (!res.ok) {
    throw new Error(`reading ${META_KEY} failed: ${res.status} ${await res.text()}`)
  }

  return await res.json() as Meta
}

async function bulkPut (entries: Array<{ key: string, value: string }>): Promise<void> {
  for (let i = 0; i < entries.length; i += BULK_LIMIT) {
    const chunk = entries.slice(i, i + BULK_LIMIT)
    const res = await fetch(`${kvBase}/bulk`, {
      method: 'PUT',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(chunk)
    })
    const body = await res.json() as { success: boolean, errors: unknown[] }

    if (!res.ok || !body.success) {
      throw new Error(`bulk write failed: ${res.status} ${JSON.stringify(body.errors)}`)
    }
  }
}

const digest = (value: string): string => createHash('sha256').update(value).digest('hex').slice(0, 16)

const previous = await readMeta()
const res = await fetch(listUrl)

if (!res.ok) {
  throw new Error(`downloading ${listUrl} failed: ${res.status}`)
}

const etag = res.headers.get('etag')

if (!force && previous?.etag != null && etag === previous.etag) {
  console.info(`list unchanged (${etag}), nothing to do`)
  process.exit(0)
}

const { hashes, skipped } = parseDenylist(await res.text())

if (skipped > 0) {
  // the edge only enforces legacy `//<sha256 hex>` entries; say so loudly
  // rather than pretend other rule types are covered
  console.info(`::warning::${skipped} denylist entries are not legacy double-hashes and are NOT enforced at the edge`)
}

if (!force && previous != null && hashes.length < previous.count * MIN_RATIO) {
  throw new Error(`list shrank from ${previous.count} to ${hashes.length} entries, refusing to sync (set FORCE=true to override)`)
}

const shards = buildShards(hashes)
const digests: Record<string, string> = {}

for (const [prefix, value] of shards) {
  digests[prefix] = digest(value)
}

const changed = changedPrefixes(previous?.shards ?? {}, digests)
await bulkPut(changed.map(prefix => ({ key: shardKey(prefix), value: shards.get(prefix) ?? '' })))

const meta: Meta = { etag, count: hashes.length, updated: new Date().toISOString(), shards: digests }
await bulkPut([{ key: META_KEY, value: JSON.stringify(meta) }])

console.info(`synced ${hashes.length} entries (${etag}): ${changed.length} of ${shards.size} shards written`)
