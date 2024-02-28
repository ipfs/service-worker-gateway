/**
 * If you host helia-service-worker-gateway on an IPFS domain, the redirects file will route some requests from
 * `<domain>/<wildcard-splat>` to `https://<domain>/?helia-sw=<wildcard-splat>`.
 *
 * This function will check for "?helia-sw=" in the URL and modify the URL so that it works with the rest of our logic
 */
export function getActualUrl (urlString: string): URL {
  const url = new URL(urlString)
  const heliaSw = url.searchParams.get('helia-sw')
  if (heliaSw != null) {
    url.searchParams.delete('helia-sw')
    url.pathname = heliaSw
  }
  return url
}
