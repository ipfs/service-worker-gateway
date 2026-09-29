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
// as soon as the synced shard reaches the colo (at most SHARD_TTL_S), without
// purging the host's cached installer.
//
// Lookups fail open: if KV errors, the request is served and the error
// logged. Refusing every subdomain because the denylist store is unreachable
// would take the gateway down to block a handful of hosts.

import installerCache from '../../snippets/02_shared_sw_installer_cache.ts'
import { createShardStore, denylistAnchors, goneResponse, isDenied, parseExtraHashes } from './badbits.ts'
import type { Namespace } from './badbits.ts'

export interface Env {
  BADBITS: KVNamespace
  /** optional sha256 hex digests to refuse in addition to the list */
  EXTRA_DENY_HASHES?: string
}

const SUBDOMAIN = /^([^.]+)\.(ipfs|ipns)\.(inbrowser\.(?:dev|link))$/

export interface Dependencies {
  installer(request: Request): Promise<Response>
  cache?: Pick<Cache, 'match' | 'put'>
}

export async function handle (request: Request, env: Env, ctx: Pick<ExecutionContext, 'waitUntil'>, deps: Dependencies): Promise<Response> {
  const url = new URL(request.url)
  const match = SUBDOMAIN.exec(url.hostname)

  if (match != null) {
    const [, label, namespace, baseDomain] = match
    const anchors = denylistAnchors(label, namespace as Namespace, url.pathname)
    const store = createShardStore({
      kv: env.BADBITS,
      cache: deps.cache,
      cacheBase: `https://${baseDomain}`,
      waitUntil: promise => { ctx.waitUntil(promise) }
    })

    try {
      if (await isDenied(anchors, store, parseExtraHashes(env.EXTRA_DENY_HASHES))) {
        return goneResponse()
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('badbits lookup failed, serving request', err)
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
