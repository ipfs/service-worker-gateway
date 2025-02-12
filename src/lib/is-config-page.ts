/**
 * As of https://github.com/ipfs/service-worker-gateway/issues/486, we no longer have a singular page at
 * /#/ipfs-sw-config unless loaded directly from a subdomain. The configuration section is now on the main page (helper-ui.tsx)
 *
 * We still use /#/ipfs-sw-config to allow subdomain users to change config and we need to detect that.
 */
export function isConfigPage (hash: string): boolean {
  const isConfigHashPath = hash.startsWith('#/ipfs-sw-config') // needed for _redirects and IPFS hosted sw gateways
  return isConfigHashPath && hash.endsWith('/ipfs-sw-config')
}
