// Badbits denylist sharding, shared by the sync job and the Worker.
//
// badbits.deny is a compact denylist (IPIP-383) of ~500k legacy
// double-hash entries: `//` followed by the sha256 hex of
// `CIDV1_BASE32/PATH`. One KV key per hash would need half a million
// writes for a full load, so entries are grouped by the first
// SHARD_PREFIX_LENGTH hex characters instead. That gives 4096 shards of
// ~125 entries (~8 KB each): a full load is 4096 writes, a list update
// touches only the shards whose contents changed, and a lookup reads a
// single small value that caches well at the edge.
//
// Each shard value holds the remaining hex characters of its hashes,
// sorted and newline separated. Every line has the same width, so a lookup
// binary-searches the string in place instead of splitting it: an isolate
// holding thousands of shards keeps ~8 KB strings, not ~125 small strings
// each.
//
// Keys written by the sync, in order:
//
//   bb:<prefix>  shards that changed
//   bb:meta      ETag, count and a digest per shard (used to diff next run)
//   bb:status    small summary the Worker and the deploy gate read; written
//                last and on every run, so `checked` shows the sync is alive
//
// @see https://specs.ipfs.tech/compact-denylist-format/

export const SHARD_PREFIX_LENGTH = 3
export const SHARD_KEY_PREFIX = 'bb:'
export const META_KEY = 'bb:meta'
export const STATUS_KEY = 'bb:status'

/** width of one shard line: a sha256 hex digest minus its prefix */
export const SHARD_LINE_WIDTH = 64 - SHARD_PREFIX_LENGTH

/**
 * Fewer entries than this means a truncated download or an empty store:
 * the list held 513,017 entries in September 2026 and only grows.
 */
export const MIN_ENTRIES = 450_000

export interface SyncStatus {
  /** ETag of the list that was last written */
  etag: string | null
  /** legacy entries in that list */
  count: number
  /** entries the edge cannot enforce */
  unenforced: number
  /** when the shards last changed */
  updated: string
  /** when a sync last completed, changed or not */
  checked: string
}

const LEGACY_DOUBLE_HASH = /^\/\/([0-9a-f]{64})$/

export interface ParsedDenylist {
  /** sha256 hex digests from legacy `//<hex>` entries */
  hashes: string[]
  /** entries this parser does not enforce (modern multihash, plain paths, negations) */
  skipped: number
}

/**
 * Extract the legacy double-hash entries from a compact denylist. The
 * optional header ends at the first `---` line; comments and blank lines are
 * ignored. Anything else is counted in `skipped` so the caller can report it
 * rather than silently not enforcing it.
 */
export function parseDenylist (text: string): ParsedDenylist {
  const lines = text.split('\n')
  const headerEnd = lines.findIndex(line => line.trim() === '---')
  const body = headerEnd === -1 ? lines : lines.slice(headerEnd + 1)

  const hashes: string[] = []
  let skipped = 0

  for (const raw of body) {
    const line = raw.trim()

    if (line === '' || line.startsWith('#')) {
      continue
    }

    const match = LEGACY_DOUBLE_HASH.exec(line)

    if (match == null) {
      skipped++
      continue
    }

    hashes.push(match[1])
  }

  return { hashes, skipped }
}

export function shardKey (prefix: string): string {
  return `${SHARD_KEY_PREFIX}${prefix}`
}

/**
 * Group hashes into shard values keyed by prefix. Duplicates are dropped and
 * each value is sorted, so the same list always produces byte-identical
 * shards and unchanged shards can be skipped on upload.
 */
export function buildShards (hashes: string[]): Map<string, string> {
  const groups = new Map<string, Set<string>>()

  for (const hash of hashes) {
    const prefix = hash.slice(0, SHARD_PREFIX_LENGTH)
    let group = groups.get(prefix)

    if (group == null) {
      group = new Set()
      groups.set(prefix, group)
    }

    group.add(hash.slice(SHARD_PREFIX_LENGTH))
  }

  const shards = new Map<string, string>()

  for (const prefix of [...groups.keys()].sort()) {
    shards.set(prefix, [...groups.get(prefix)!].sort().join('\n'))
  }

  return shards
}

/**
 * Parse a shard value back into the set of hash suffixes it holds.
 */
export function parseShard (value: string | null): Set<string> {
  if (value == null || value === '') {
    return new Set()
  }

  return new Set(value.split('\n'))
}

/**
 * Whether a shard value (as written by `buildShards`) holds `suffix`, by
 * binary search over its fixed-width lines. Falls back to a linear scan if
 * the value is not in the expected shape rather than missing a match.
 */
export function shardHas (value: string, suffix: string): boolean {
  if (value === '' || suffix.length !== SHARD_LINE_WIDTH) {
    return false
  }

  const stride = SHARD_LINE_WIDTH + 1

  if ((value.length + 1) % stride !== 0) {
    return value.split('\n').includes(suffix)
  }

  let lo = 0
  let hi = (value.length + 1) / stride - 1

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1
    const line = value.slice(mid * stride, mid * stride + SHARD_LINE_WIDTH)

    if (line === suffix) {
      return true
    }

    if (line < suffix) {
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }

  return false
}

/**
 * Prefixes whose shard differs between two digest maps, including prefixes
 * that disappeared (their shard must be emptied).
 */
export function changedPrefixes (previous: Record<string, string>, next: Record<string, string>): string[] {
  const prefixes = new Set([...Object.keys(previous), ...Object.keys(next)])

  return [...prefixes].filter(prefix => previous[prefix] !== next[prefix]).sort()
}
