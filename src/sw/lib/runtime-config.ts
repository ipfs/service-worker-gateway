import { config as defaultConfig } from '../../config/index.ts'
import { loadUserConfig } from '../../lib/config-db.ts'
import { QUERY_PARAMS } from '../../lib/constants.ts'
import { getSwLogger } from '../../lib/logger.ts'
import type { Config } from '../../config/index.ts'
import type { PersistedConfig } from '../../lib/config-db.ts'

/**
 * The effective config for a single request, after merging
 * URL params > persisted config > build-time defaults.
 *
 * `gateways` and `routers` are origin strings suitable for passing to
 * `verified-fetch` as `recursiveGateways` / `delegatedRouters` (the block
 * broker appends `/ipfs/{cid}` itself).
 */
export interface ResolvedConfig {
  gateways: string[]
  routers: string[]
  dnsResolvers: Record<string, string | string[]>
  fetchTimeout: number
  debug: string
  /**
   * Stable hash of `(gateways, routers, dnsResolvers)` used to key
   * `verifiedFetch` instances so different backends get their own Helia.
   */
  hash: string
  /**
   * Persisted config generation, included in content cache keys so a config
   * save invalidates entries fetched with the previous backends.
   */
  generation: number
  /**
   * Which layer supplied the `gateways`/`routers` override, for logging.
   */
  source: 'url' | 'persisted' | 'defaults'
}

/**
 * Normalized form of a single user gateway entry.
 *
 * `template` is the canonical URL template (with `{cid}` and `?format=raw`)
 * used for display, export, and health probes. `origin` is the origin string
 * passed to `verified-fetch`; it is `null` for subdomain-style templates
 * (`{cid}` in the host) which the current `verified-fetch` API cannot consume
 * as a `recursiveGateway` (see design doc open question #1).
 */
export interface NormalizedGateway {
  template: string
  origin: string | null
}

const CID_PLACEHOLDER = '__cid__'

/**
 * Normalize a user-entered gateway entry to a canonical template + origin.
 * Accepted forms (see design doc §3.4):
 * - bare origin: `https://my-gw.example` → `https://my-gw.example/ipfs/{cid}?format=raw`
 * - origin + /ipfs: `https://my-gw.example/ipfs/` → same
 * - explicit template: `https://{cid}.ipfs.my-gw.example` → verbatim + `?format=raw`
 * - `[cid]` is rewritten to `{cid}`
 * - scheme is defaulted to `https://`
 */
export function normalizeGatewayEntry (input: string): NormalizedGateway | null {
  let str = input.trim()
  if (str === '') {
    return null
  }
  if (!/^https?:\/\//.test(str)) {
    str = `https://${str}`
  }
  // `[cid]` → `{cid}`
  str = str.replaceAll('[cid]', '{cid}')
  // strip trailing slashes
  str = str.replace(/\/+$/, '')

  let template: string
  let origin: string | null

  if (str.includes('{cid}')) {
    template = appendFormatRaw(str)
    origin = originFromTemplate(str)
  } else {
    // Bare origin or origin + path. Build a path-style template.
    let parsed: URL
    try {
      parsed = new URL(str)
    } catch {
      return null
    }
    const pathname = parsed.pathname
    if (pathname === '' || pathname === '/' || pathname.endsWith('/ipfs') || pathname.endsWith('/ipfs/')) {
      template = `${parsed.origin}/ipfs/{cid}?format=raw`
    } else {
      // Treat as a path prefix.
      template = `${str}/ipfs/{cid}?format=raw`
    }
    origin = parsed.origin
  }

  return { template, origin }
}

/**
 * Normalize a router entry to an origin string (`/routing/v1` is appended by
 * the client). Returns null if the entry cannot be parsed.
 */
export function normalizeRouterEntry (input: string): string | null {
  let str = input.trim()
  if (str === '') {
    return null
  }
  if (!/^https?:\/\//.test(str)) {
    str = `https://${str}`
  }
  try {
    const parsed = new URL(str)
    return parsed.origin
  } catch {
    return null
  }
}

function appendFormatRaw (template: string): string {
  if (/[?&]format=raw($|&)/.test(template)) {
    return template
  }
  return `${template}?format=raw`
}

/**
 * Derive a `verified-fetch`-compatible origin from a template string. Returns
 * null when `{cid}` appears in the host (subdomain-style), since that cannot
 * be reduced to a single origin for `recursiveGateways`.
 */
function originFromTemplate (template: string): string | null {
  const substituted = template.replaceAll('{cid}', CID_PLACEHOLDER)
  let parsed: URL
  try {
    parsed = new URL(substituted)
  } catch {
    return null
  }
  if (parsed.hostname.includes(CID_PLACEHOLDER)) {
    return null
  }
  return parsed.origin
}

/**
 * Extract one-shot `gateways` / `routers` overrides from a request URL.
 * Returns raw (unnormalized) entry lists; empty arrays mean "not present".
 */
export function overridesFromUrl (url: URL): { gateways: string[], routers: string[] } {
  return {
    gateways: url.searchParams.getAll(QUERY_PARAMS.GATEWAYS),
    routers: url.searchParams.getAll(QUERY_PARAMS.ROUTERS)
  }
}

// --- persisted config cache ------------------------------------------------

let cachedPersisted: PersistedConfig | undefined | null = null
let cachedPersistedAt = 0
const PERSISTED_CACHE_TTL_MS = 60_000

/**
 * Clear the in-memory persisted-config cache. Called by the SW when the
 * settings UI signals that config was saved (see `sw.ts` message listener),
 * so subsequent requests re-read from IDB instead of waiting for the TTL.
 */
export function invalidatePersistedConfigCache (): void {
  cachedPersisted = null
  cachedPersistedAt = 0
}

async function getPersistedConfig (): Promise<PersistedConfig | undefined> {
  const now = Date.now()
  if (cachedPersisted !== null && (now - cachedPersistedAt) < PERSISTED_CACHE_TTL_MS) {
    return cachedPersisted ?? undefined
  }
  try {
    cachedPersisted = await loadUserConfig() ?? null
    cachedPersistedAt = now
  } catch {
    // IDB unavailable (e.g. private mode) — treat as no persisted config.
    cachedPersisted = null
    cachedPersistedAt = now
  }
  return cachedPersisted ?? undefined
}

/**
 * Resolve the effective config for a request.
 *
 * Precedence: URL params > persisted config > build-time defaults.
 */
export async function resolveConfig (url: URL, defaults: Config = defaultConfig): Promise<ResolvedConfig> {
  const log = getSwLogger('runtime-config')
  const urlOverrides = overridesFromUrl(url)
  const persisted = await getPersistedConfig()

  let gateways: string[]
  let routers: string[]
  let source: ResolvedConfig['source']

  const urlGw = gatewayOrigins(urlOverrides.gateways)
  const urlRt = normalizeEntries(urlOverrides.routers, normalizeRouterEntry)

  if (urlGw.length > 0 || urlRt.length > 0) {
    // URL params present: use them verbatim for this navigation. If a list
    // is absent in the params, fall back to persisted then defaults so a
    // link can override only one of the two.
    gateways = urlGw.length > 0
      ? urlGw
      : gatewayOrigins(persisted?.gateways ?? []) || defaults.gateways
    routers = urlRt.length > 0
      ? urlRt
      : normalizeEntries(persisted?.routers ?? [], normalizeRouterEntry) || defaults.routers
    source = 'url'
  } else if (persisted != null && (persisted.gateways.length > 0 || persisted.routers.length > 0)) {
    gateways = gatewayOrigins(persisted.gateways) || defaults.gateways
    routers = normalizeEntries(persisted.routers, normalizeRouterEntry) || defaults.routers
    source = 'persisted'
  } else {
    gateways = defaults.gateways
    routers = defaults.routers
    source = 'defaults'
  }

  // Subdomain-style gateway templates cannot be consumed by verified-fetch
  // as origins. Log them so the user understands why they were skipped.
  if (urlOverrides.gateways.length > 0) {
    const skipped = urlOverrides.gateways.filter((entry) => {
      const n = normalizeGatewayEntry(entry)
      return n != null && n.origin == null
    })
    if (skipped.length > 0) {
      log('skipping %d subdomain-style gateway entry/ies from URL params (unsupported as recursiveGateway origins): %o', skipped.length, skipped)
    }
  }

  const generation = persisted?.generation ?? 0
  const dnsResolvers = defaults.dnsResolvers
  const hash = stableHash({ gateways, routers, dnsResolvers })

  return {
    gateways,
    routers,
    dnsResolvers,
    fetchTimeout: defaults.fetchTimeout,
    debug: defaults.debug,
    hash,
    generation,
    source
  }
}

function normalizeEntries<T> (entries: string[], normalize: (input: string) => T | null): T[] {
  const out: T[] = []
  for (const entry of entries) {
    const n = normalize(entry)
    if (n != null) {
      out.push(n)
    }
  }
  return out
}

/**
 * Normalize a list of gateway entries and extract the `verified-fetch`-compatible
 * origin strings. Subdomain-style templates (with `{cid}` in the host) yield
 * `origin: null` and are filtered out — they cannot be consumed as
 * `recursiveGateways` by the current `@helia/http` API.
 */
function gatewayOrigins (entries: string[]): string[] {
  const out: string[] = []
  for (const entry of entries) {
    const n = normalizeGatewayEntry(entry)
    if (n?.origin != null) {
      out.push(n.origin)
    }
  }
  return out
}

/**
 * djb2 — a small, dependency-free stable hash. Only used as a cache key, not
 * for cryptography.
 */
function stableHash (input: { gateways: string[], routers: string[], dnsResolvers: Record<string, string | string[]> }): string {
  const json = JSON.stringify({
    gateways: input.gateways,
    routers: input.routers,
    dnsResolvers: input.dnsResolvers
  })
  let hash = 5381
  for (let i = 0; i < json.length; i++) {
    hash = ((hash << 5) + hash + json.charCodeAt(i)) | 0
  }
  return (hash >>> 0).toString(16)
}
