// Cloudflare Worker: edge for the per-CID subdomains of the gateway.
//
// Runs on `*.ipfs.inbrowser.*` and `*.ipns.inbrowser.*`. For each request
// it:
//
//   1. refuses the host with 410 if its root (or the requested path) is on
//      the badbits denylist, the check Rainbow used to do as origin, and
//   2. otherwise hands the request to the shared installer cache logic that
//      used to run as snippet 02 on these hosts.
//
// Both steps live in one Worker because Cloudflare advises against running
// Snippets and Workers on the same URLs, and ordering between the two is not
// something to rely on for a takedown mechanism. Snippet 02 now only matches
// the apex hosts.
//
// The check runs before any cache lookup, so a newly listed CID is refused
// once its shard reaches the colo (see SHARD_TTL_S and SHARD_MAX_STALE_S),
// without purging the host's cached installer.
//
// Lookups fail open: if KV errors, the request is served. Refusing every
// subdomain because the denylist store is unreachable would take the gateway
// down to block a handful of hosts. Because failing open is silent by
// nature, every such case is reported (see `report`), and so is a store that
// is missing or no longer being synced.

import installerCache from '../../snippets/02_shared_sw_installer_cache.ts'
import { createShardStore, denylistAnchors, goneResponse, isDenied, parseExtraHashes } from './badbits.ts'
import type { Namespace, ShardStore } from './badbits.ts'

export interface Env {
  BADBITS: KVNamespace
  /**
   * Optional sha256 hex digests to refuse in addition to the list. Set it as
   * a secret (`wrangler secret put`): plain dashboard variables are removed
   * by the next `wrangler deploy`, which would silently lift a block.
   */
  EXTRA_DENY_HASHES?: string
  /** optional Analytics Engine dataset for alerting on the events below */
  METRICS?: AnalyticsEngineDataset
}

/** the sync runs every 5 minutes; this much silence means it has stopped */
export const STALE_AFTER_MS = 2 * 60 * 60 * 1000
/** report store health at most this often per isolate */
export const HEALTH_CHECK_INTERVAL_MS = 60 * 1000
/**
 * Answers whether the denylist store is fresh, for an external health check
 * to alert on: Cloudflare can't alert on the events below. Under the
 * gateway's own /ipfs-sw- prefix so it never shadows content.
 */
export const STORE_STATUS_PATH = '/ipfs-sw-badbits-status'

export type EdgeEvent = 'badbits_blocked' | 'badbits_lookup_error' | 'badbits_store_missing' | 'badbits_store_stale' | 'badbits_index_missing'

const SUBDOMAIN = /^([^.]+)\.(ipfs|ipns)\.(inbrowser\.(?:dev|link))$/

let lastHealthCheck = -Infinity

/** test hook */
export function resetHealthCheck (): void {
  lastHealthCheck = -Infinity
}

export interface Dependencies {
  installer(request: Request): Promise<Response>
  cache?: Pick<Cache, 'match' | 'put'>
  now?(): number
  log?(line: string): void
}

function report (env: Env, deps: Dependencies, event: EdgeEvent, host: string, value = 1, detail?: unknown): void {
  const line = JSON.stringify({ event, host, value, ...(detail != null ? { detail: String(detail) } : {}) })

  if (deps.log != null) {
    deps.log(line)
  } else if (event === 'badbits_blocked') {
    // eslint-disable-next-line no-console
    console.log(line)
  } else {
    // eslint-disable-next-line no-console
    console.error(line)
  }

  try {
    env.METRICS?.writeDataPoint({ indexes: [event], blobs: [event, host], doubles: [value] })
  } catch {
    // metrics must never affect the response; the log line above remains
  }
}

async function checkStoreHealth (store: ShardStore, env: Env, deps: Dependencies, host: string, now: number): Promise<void> {
  try {
    const status = await store.status()

    if (status == null) {
      report(env, deps, 'badbits_store_missing', host)
      return
    }

    const age = now - Date.parse(status.checked)

    if (!(age <= STALE_AFTER_MS)) {
      report(env, deps, 'badbits_store_stale', host, Math.round(age / 1000), status.checked)
    }

    // still enforced without it, but every lookup then waits on a shard read
    if (await store.index() == null) {
      report(env, deps, 'badbits_index_missing', host)
    }
  } catch (err) {
    report(env, deps, 'badbits_lookup_error', host, 1, err)
  }
}

/**
 * 200 with `"fresh":true` while the sync is alive, 503 otherwise (never
 * synced, stale, or KV unreadable). The health check matches the body too,
 * so an installer page answering 200 for an unknown path can't pass it.
 */
async function storeStatusResponse (store: ShardStore, now: number): Promise<Response> {
  let body: Record<string, unknown>

  try {
    const status = await store.status()

    if (status == null) {
      body = { fresh: false, reason: 'missing' }
    } else {
      const ageS = Math.round((now - Date.parse(status.checked)) / 1000)
      const fresh = ageS * 1000 <= STALE_AFTER_MS
      body = { fresh, ...(fresh ? {} : { reason: 'stale' }), checked: status.checked, updated: status.updated, ageS, count: status.count }
    }
  } catch (err) {
    body = { fresh: false, reason: 'error', error: String(err) }
  }

  return new Response(JSON.stringify(body), {
    status: body.fresh === true ? 200 : 503,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
  })
}

export async function handle (request: Request, env: Env, ctx: Pick<ExecutionContext, 'waitUntil'>, deps: Dependencies): Promise<Response> {
  const url = new URL(request.url)
  const match = SUBDOMAIN.exec(url.hostname)

  if (match != null) {
    const [, label, namespace, baseDomain] = match
    const now = deps.now ?? Date.now
    const store = createShardStore({
      kv: env.BADBITS,
      cache: deps.cache,
      cacheBase: `https://${baseDomain}`,
      waitUntil: promise => { ctx.waitUntil(promise) },
      onRefreshError: err => { report(env, deps, 'badbits_lookup_error', url.hostname, 1, err) },
      now
    })

    if (url.pathname === STORE_STATUS_PATH) {
      return storeStatusResponse(store, now())
    }

    // off the request path: an empty or frozen store would otherwise block
    // nothing without any error
    if (now() - lastHealthCheck >= HEALTH_CHECK_INTERVAL_MS) {
      lastHealthCheck = now()
      ctx.waitUntil(checkStoreHealth(store, env, deps, url.hostname, now()))
    }

    try {
      if (await isDenied(denylistAnchors(label, namespace as Namespace, url.pathname), store, parseExtraHashes(env.EXTRA_DENY_HASHES))) {
        report(env, deps, 'badbits_blocked', url.hostname)
        return goneResponse()
      }
    } catch (err) {
      report(env, deps, 'badbits_lookup_error', url.hostname, 1, err)
    }
  }

  return deps.installer(request)
}

export default {
  async fetch (request, env, ctx) {
    return handle(request, env, ctx, {
      installer: async req => installerCache.fetch(req),
      // the Workers runtime adds `default`; the DOM CacheStorage type lacks it
      cache: typeof caches === 'undefined' ? undefined : (caches as unknown as { default: Cache }).default
    })
  }
} satisfies ExportedHandler<Env>
