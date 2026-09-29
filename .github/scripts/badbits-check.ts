// Deploy gate for the gateway-edge Worker: refuses to deploy against a
// denylist store that is empty, too small or no longer being synced, since
// the Worker would then block nothing without any error.
//
// Run with: node --experimental-strip-types .github/scripts/badbits-check.ts
//
// Env:
//   CF_ACCOUNT_ID    Cloudflare account
//   CF_KV_TOKEN      API token with Account > Workers KV Storage > Read
//   BADBITS_KV_ID    KV namespace id (read from wrangler.toml by the workflow)
//   MAX_AGE_HOURS    optional, how old `checked` may be (default 24)

import { MIN_ENTRIES, STATUS_KEY } from '../../src/cloudflare/workers/gateway-edge/shards.ts'
import type { SyncStatus } from '../../src/cloudflare/workers/gateway-edge/shards.ts'

const env = (name: string): string => {
  const value = process.env[name]

  if (value == null || value === '') {
    throw new Error(`${name} is not set`)
  }

  return value
}

const fail = (message: string): never => {
  console.info(`::error::${message}`)
  process.exit(1)
}

const maxAgeHours = Number(process.env.MAX_AGE_HOURS ?? '24')
const url = `https://api.cloudflare.com/client/v4/accounts/${env('CF_ACCOUNT_ID')}/storage/kv/namespaces/${env('BADBITS_KV_ID')}/values/${encodeURIComponent(STATUS_KEY)}`
const res = await fetch(url, { headers: { Authorization: `Bearer ${env('CF_KV_TOKEN')}` } })

if (res.status === 404) {
  fail(`${STATUS_KEY} is missing: run the Badbits Sync workflow before deploying (see docs/BADBITS.md)`)
}

if (!res.ok) {
  fail(`reading ${STATUS_KEY} failed: ${res.status} ${await res.text()}`)
}

const status = await res.json() as SyncStatus
const ageHours = (Date.now() - Date.parse(status.checked)) / 3_600_000

if (!(status.count >= MIN_ENTRIES)) {
  fail(`denylist store holds ${status.count} entries, below the ${MIN_ENTRIES} floor`)
}

if (!(ageHours <= maxAgeHours)) {
  fail(`denylist store was last synced ${status.checked} (${ageHours.toFixed(1)}h ago), over ${maxAgeHours}h`)
}

console.info(`denylist store ok: ${status.count} entries, synced ${status.checked}${status.unenforced > 0 ? `, ${status.unenforced} unenforced` : ''}`)
