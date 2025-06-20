/**
 * This file is an attempt to consolidate all the query params that are used in the service worker.
 *
 * This will allow us a single location to define and describe all the query params that are used in the service worker.
 */

export const QUERY_PARAMS = {
  /**
   * The query param that is used to send the config to the subdomain service worker.
   */
  IPFS_SW_CFG: 'ipfs-sw-cfg',

  /**
   * The query param that is used to request the config from the root domain service worker.
   */
  IPFS_SW_SUBDOMAIN_REQUEST: 'ipfs-sw-subdomain-request',

  /**
   * The path that is used to request content from the IPFS network.
   */
  HELIA_SW: 'helia-sw'
}
