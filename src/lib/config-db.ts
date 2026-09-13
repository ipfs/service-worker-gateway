import { GenericIDB } from './generic-db.ts'

/**
 * User-configurable overrides for the service worker gateway's retrieval
 * backends. Restores the v2.x `ConfigDb` idea on top of `GenericIDB`.
 *
 * Values are stored unnormalized; normalization to canonical templates happens
 * at resolve time (see `src/sw/lib/runtime-config.ts`).
 */
export interface PersistedConfig {
  gateways: string[]
  routers: string[]
  /**
   * Schema version, bumped on breaking changes so migrations can be added
   * later. Not used for invalidation yet.
   */
  version: number
  /**
   * Bumped every time the user saves a new config. The content handler
   * includes this in the cache key so a save invalidates stale entries that
   * were fetched with the previous backends.
   */
  generation: number
}

export const PERSISTED_CONFIG_VERSION = 1

const DB_NAME = 'helia-service-worker-gateway'
const STORE_NAME = 'config'
const CONFIG_KEY = 'userConfig'

/**
 * DB schema: a single record under the `userConfig` key holding the full
 * `PersistedConfig`. Wrapped in an interface so `'userConfig'` is a valid
 * `keyof` for `GenericIDB`'s typed `get`/`put`.
 */
interface ConfigDbSchema {
  userConfig: PersistedConfig
}

/**
 * Shared across service worker reinstalls (unlike `sw-config.ts` which is
 * per-installation), so a user's custom backends survive SW updates.
 */
let configDb: GenericIDB<ConfigDbSchema> | undefined

function getConfigDb (): GenericIDB<ConfigDbSchema> {
  if (configDb == null) {
    configDb = new GenericIDB<ConfigDbSchema>(DB_NAME, STORE_NAME)
  }

  return configDb
}

/**
 * Returns true when the current origin is a content subdomain
 * (`*.ipfs.<root>` / `*.ipns.<root>`), where persisted config must be
 * read-only. Persisted config is writable only from the root/landing origin
 * so a dApp on a sibling subdomain cannot rewrite a user's backends
 * (cf. RFC 6265 §8.6, and the discussion in #22).
 */
export function isContentSubdomain (): boolean {
  const host = globalThis?.location?.host
  if (host == null) {
    // No `location` (e.g. running in a non-browser test context): allow writes
    // so tests can seed the store.
    return false
  }

  return host.includes('.ipfs.') || host.includes('.ipns.')
}

/**
 * Read the user's persisted config. Read-only; callable from anywhere,
 * including content subdomains (the service worker needs to read overrides
 * while serving content).
 *
 * Returns `undefined` when no config has been persisted, in which case
 * callers fall back to build-time defaults.
 */
export async function loadUserConfig (): Promise<PersistedConfig | undefined> {
  const db = getConfigDb()
  await db.open()
  try {
    return await db.get(CONFIG_KEY)
  } catch {
    return undefined
  }
}

/**
 * Persist a user config. Refuses to write from content subdomains; the
 * settings UI only renders on the root page, so this guard is
 * defense-in-depth.
 *
 * Bumps `generation` so cached responses fetched with the previous backends
 * are invalidated (see `content-request-handler.ts`).
 */
export async function saveUserConfig (cfg: Omit<PersistedConfig, 'version' | 'generation'>): Promise<PersistedConfig> {
  if (isContentSubdomain()) {
    throw new Error('Persisted gateway/router config is read-only from content subdomains. Open the settings page on the root origin.')
  }

  const previous = await loadUserConfig()
  const next: PersistedConfig = {
    gateways: cfg.gateways,
    routers: cfg.routers,
    version: PERSISTED_CONFIG_VERSION,
    generation: (previous?.generation ?? 0) + 1
  }

  const db = getConfigDb()
  await db.open()
  await db.put(CONFIG_KEY, next)

  return next
}

/**
 * Clear the persisted config so the gateway falls back to build-time
 * defaults. Also subject to the subdomain write-scope guard.
 */
export async function resetUserConfig (): Promise<void> {
  if (isContentSubdomain()) {
    throw new Error('Persisted gateway/router config is read-only from content subdomains. Open the settings page on the root origin.')
  }

  const previous = await loadUserConfig()
  // Bump generation even on reset so cached entries from the user's custom
  // backends are invalidated.
  const next: PersistedConfig = {
    gateways: [],
    routers: [],
    version: PERSISTED_CONFIG_VERSION,
    generation: (previous?.generation ?? 0) + 1
  }

  const db = getConfigDb()
  await db.open()
  await db.put(CONFIG_KEY, next)
}

/**
 * Read only the current generation counter. Used by the content handler to
 * include in the cache key without loading the full config on every request.
 */
export async function getConfigGeneration (): Promise<number> {
  const cfg = await loadUserConfig()
  return cfg?.generation ?? 0
}
