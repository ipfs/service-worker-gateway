/**
 * This file is an attempt to consolidate all the query params and hash fragments that are used in the service worker.
 *
 * This will allow us a single location to define and describe all the query params that are used in the service worker.
 */

export const QUERY_PARAMS = {
  /**
   * Uninstall the service worker. Note that visiting any page will result in
   * it being re-installed.
   */
  UNREGISTER_SERVICE_WORKER: 'ipfs-sw-unregister',

  /**
   * When the path is `/ipfs/` or `/ipns/` and this query parameter is present,
   * we should parse the URI and redirect to the resource.
   *
   * @see https://specs.ipfs.tech/http-gateways/subdomain-gateway/#uri-router
   */
  URI_ROUTER: 'uri',

  /**
   * One-shot override of the trustless gateways used for block retrieval.
   * Repeatable; each value is a gateway entry (see `normalizeGatewayEntry`).
   * Presence of this param for a navigation means "use these verbatim,
   * ignore persisted config" for that navigation only.
   */
  GATEWAYS: 'gateways',

  /**
   * One-shot override of the delegated routing endpoints (`/routing/v1`).
   * Repeatable; each value is a router origin.
   */
  ROUTERS: 'routers',

  /**
   * Purge all Cache API storage created by the service worker. Cache storage
   * persists across SW deregistrations, so this is the only way to reclaim
   * that space short of clearing site data. Visiting any page will re-install
   * the SW afterwards.
   *
   * @see https://github.com/ipfs/service-worker-gateway/issues/507
   */
  PURGE_CACHES: 'ipfs-sw-purge-caches'
}

/**
 * Hash fragments are used to trigger responses from the service worker gateway.
 *
 * They are not
 */
export const HASH_FRAGMENTS = {
  /**
   * Show the the UI load page
   */
  IPFS_SW_LOAD_UI: 'ipfs-sw-load',

  /**
   * Show the the UI about page
   */
  IPFS_SW_ABOUT_UI: 'ipfs-sw-about',

  /**
   * Show the the UI error page
   */
  IPFS_SW_FETCH_ERROR_UI: 'ipfs-sw-fetch-error',

  /**
   * Show the the UI error page
   */
  IPFS_SW_SERVER_ERROR_UI: 'ipfs-sw-server-error',

  /**
   * The hash fragment that is used to request the origin isolation warning
   * page.
   */
  IPFS_SW_ORIGIN_ISOLATION_WARNING: 'ipfs-sw-origin-isolation-warning',

  /**
   * Show the user-configurable gateways/routers settings page. The page is
   * only writable from the root/landing origin (see `config-db.ts`).
   */
  IPFS_SW_CONFIG_UI: 'ipfs-sw-config'
}
