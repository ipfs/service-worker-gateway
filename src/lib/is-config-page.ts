export function isConfigPage (): boolean {
  const isConfigPathname = window.location.pathname === '/config'
  const isConfigHashPath = window.location.hash.startsWith('#/config') // needed for _redirects and IPFS hosted sw gateways
  return isConfigPathname || isConfigHashPath
}
