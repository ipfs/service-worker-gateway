import { QUERY_PARAMS } from './constants.js'

/**
 * This function will check for "?helia-sw=" in the URL and modify the URL so that it works with the rest of our logic
 *
 * Before the service worker is registered, if you host helia-service-worker-gateway with an IPFS gateway, the
 * _redirects file will return requests for `<domain>/(ipns|ipfs)/<wildcard-splat>` to
 * `https://<domain>/ipfs-sw-first-hit.html`, which handles setting a `helia-sw` parameter to the remaining path. This
 * results in the sw being registered at the root scope, and the application will render index.html, which will register
 * the service worker at the correct scope and then handle the redirect to the desired path.
 */
export function translateIpfsRedirectUrl (urlString: URL | string): URL {
  const url = typeof urlString === 'string' ? new URL(urlString) : urlString
  const heliaSw = url.searchParams.get(QUERY_PARAMS.HELIA_SW)
  if (heliaSw != null) {
    url.searchParams.delete(QUERY_PARAMS.HELIA_SW)
    url.pathname = heliaSw
  }
  return url
}
