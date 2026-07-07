/**
 * Immutable assets are cached for a Very Long Time, so keep a version number
 * for the cache in case we, for example, release `@helia/verified-fetch` with a
 * bug fix for some response properties - in order to have consistent responses
 * cached after that release we'd increment the cache number here to invalidate
 * all existing caches.
 *
 * @see https://github.com/ipfs/service-worker-gateway/pull/853#issuecomment-3309246532
 */
export const CACHE_VERSION = '<%= MODULE_VERSION %>'

/**
 * This is one best practice that can be followed in general to keep track of
 * multiple caches used by a given service worker, and keep them all versioned.
 * It maps a shorthand identifier for a cache to a specific, versioned cache
 * name.
 *
 * Note that since global state is discarded in between service worker restarts,
 * these variables will be reinitialized each time the service worker handles an
 * event, and you should not attempt to change their values inside an event
 * handler.
 *
 * If at any point you want to force pages that use this service worker to start
 * using a fresh cache, then increment the CACHE_VERSION value. It will kick off
 * the service worker update flow and the old cache(s) will be purged as part of
 * the activate event handler when the updated service worker is activated.
 *
 * @see https://googlechrome.github.io/samples/service-worker/prefetch-video/
 */
export const CURRENT_CACHES = Object.freeze({
  mutable: `mutable-cache-v${CACHE_VERSION}`,
  immutable: `immutable-cache-v${CACHE_VERSION}`,
  swAssets: `sw-assets-v${CACHE_VERSION}`,
  delegatedRouting: 'delegated-routing-v1-cache'
})

/**
 * `Cache-Control` header for HTML pages the service worker generates itself:
 * UnixFS directory listings, the IPLD entity inspector, and the media viewer
 * wrapper. One week fresh + one month stale-while-revalidate — the value the
 * directory listing has long shipped with.
 */
export const GENERATED_HTML_CACHE_CONTROL = 'public, max-age=604800, stale-while-revalidate=2678400'
