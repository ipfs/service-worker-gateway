import { HASH_FRAGMENTS } from './constants.ts'

/**
 * As of https://github.com/ipfs/service-worker-gateway/issues/486, we no longer
 * have a singular page at /#/ipfs-sw-config unless loaded directly from a
 * subdomain.
 *
 * The configuration section is now on the main page (helper-ui.tsx)
 *
 * We still use /#/ipfs-sw-config to allow subdomain users to change config and
 * we need to detect that.
 */
export function isConfigPage (hash: string): boolean {
  // needed for _redirects and IPFS hosted sw gateways
  const isConfigHashPath = hash.startsWith(`#/${HASH_FRAGMENTS.IPFS_SW_CONFIG_UI}`)

  return isConfigHashPath
}
