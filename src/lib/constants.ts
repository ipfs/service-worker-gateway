/**
 * This file is an attempt to consolidate all the hash and query params that are used in the service worker.
 */

export const HASH_FRAGMENTS = {
  /**
   * The hash fragment that is used to send the config to the subdomain service worker.
   */
  IPFS_SW_CFG: 'ipfs-sw-cfg',

  /**
   * The hash fragment that is used to request the config from the root domain service worker.
   */
  IPFS_SW_SUBDOMAIN_REQUEST: 'ipfs-sw-subdomain-request',

  /**
   * The path that is used to request content from the IPFS network.
   */
  HELIA_SW: 'helia-sw',

  /**
   * The hash fragment that is used to request the origin isolation warning page.
   */
  ORIGIN_ISOLATION_WARNING: 'ipfs-sw-origin-isolation-warning',

  /**
   * The hash fragment that is used to request the config page directly (only needed on subdomains)
   */
  VIEW_CONFIG_PAGE: '/ipfs-sw-config'
}
