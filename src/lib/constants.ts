/**
 * This file is an attempt to consolidate all the query params and hash fragments that are used in the service worker.
 *
 * This will allow us a single location to define and describe all the query params that are used in the service worker.
 */

export const QUERY_PARAMS = {
  /**
   * The current page should redirect to this URL after initializing the default
   * config (if not already set) and installing the service worker.
   */
  REDIRECT: 'helia-redirect',

  /**
   * Before performing a redirect, load the current config and append it to the
   * redirect URL. After the redirect it will be accessible from the search
   * params in the url under the key `QUERY_PARAMS.CONFIG`
   */
  GET_CONFIG: 'helia-get-config',

  /**
   * If this param is present, the value should be deserialized and added to
   * IndexedDB for the current origin
   */
  CONFIG: 'helia-config',

  /**
   * Uninstall the service worker. Note that visiting any page will result in
   * it being re-installed.
   */
  UNREGISTER_SERVICE_WORKER: 'ipfs-sw-unregister',

  /**
   * Instructs the service worker to recreate it's verified-fetch instance with
   * config freshly loaded from the database
   */
  RELOAD_CONFIG: 'ipfs-sw-config-reload'
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
   * Show the the UI config page
   */
  IPFS_SW_CONFIG_UI: 'ipfs-sw-config',

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
