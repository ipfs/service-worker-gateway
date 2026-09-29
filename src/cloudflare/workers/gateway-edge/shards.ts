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
// sorted and newline separated.
//
// @see https://specs.ipfs.tech/compact-denylist-format/

export const SHARD_PREFIX_LENGTH = 3
export const SHARD_KEY_PREFIX = 'bb:'
export const META_KEY = 'bb:meta'

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
 * Prefixes whose shard differs between two digest maps, including prefixes
 * that disappeared (their shard must be emptied).
 */
export function changedPrefixes (previous: Record<string, string>, next: Record<string, string>): string[] {
  const prefixes = new Set([...Object.keys(previous), ...Object.keys(next)])

  return [...prefixes].filter(prefix => previous[prefix] !== next[prefix]).sort()
}
