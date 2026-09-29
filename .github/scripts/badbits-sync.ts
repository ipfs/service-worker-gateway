// Syncs badbits.deny into Workers KV as prefix shards.
// Logic and guards: src/cloudflare/workers/gateway-edge/sync.ts
//
// Run with: node --experimental-strip-types .github/scripts/badbits-sync.ts
//
// Env:
//   CF_ACCOUNT_ID       Cloudflare account
//   CF_BADBITS_TOKEN    API token with Account > Workers KV Storage > Edit
//   BADBITS_KV_ID       KV namespace id
//   BADBITS_URL         optional, defaults to the dwebops list
//   FORCE               "true" to write even if unchanged or suspiciously small
//   FULL                "true" to rewrite every shard (heals out-of-band drift)

import { runSync } from '../../src/cloudflare/workers/gateway-edge/sync.ts'

const env = (name: string): string => {
  const value = process.env[name]

  if (value == null || value === '') {
    throw new Error(`${name} is not set`)
  }

  return value
}

try {
  await runSync({
    listUrl: process.env.BADBITS_URL ?? 'https://badbits.dwebops.pub/badbits.deny',
    kvBase: `https://api.cloudflare.com/client/v4/accounts/${env('CF_ACCOUNT_ID')}/storage/kv/namespaces/${env('BADBITS_KV_ID')}`,
    token: env('CF_BADBITS_TOKEN'),
    force: process.env.FORCE === 'true',
    full: process.env.FULL === 'true',
    log: message => { console.info(message) }
  })
} catch (err) {
  console.info(`::error::${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
}
