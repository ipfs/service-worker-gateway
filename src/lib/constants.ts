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
  URI_ROUTER: 'uri'
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
  IPFS_SW_ORIGIN_ISOLATION_WARNING: 'ipfs-sw-origin-isolation-warning'
}
