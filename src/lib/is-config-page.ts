export function isConfigPage (hash: string): boolean {
  const isConfigHashPath = hash.startsWith('#/ipfs-sw-config') // needed for _redirects and IPFS hosted sw gateways
  return isConfigHashPath
}
