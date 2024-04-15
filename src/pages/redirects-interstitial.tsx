import React from 'react'

/**
 * This page is only used to capture the ?helia-sw=/ip[fn]s/blah query parameter that
 * is used by IPFS hosted versions of the service-worker-gateway when non-existent paths are requested.
 */
export default function RedirectsInterstitial (): JSX.Element {
  const windowLocation = translateIpfsRedirectUrl(window.location.href)
  if (windowLocation.href !== window.location.href) {
  /**
   * We're at a domain with ?helia-sw=, we can reload the page so the service worker will
   * capture the request
   */
    window.location.replace(windowLocation.href)
  }

  return (<>First-hit on IPFS hosted service-worker-gateway. Reloading</>)
}

/**
 * If you host helia-service-worker-gateway on an IPFS domain, the redirects file will route some requests from
 * `<domain>/<wildcard-splat>` to `https://<domain>/?helia-sw=<wildcard-splat>`.
 *
 * This function will check for "?helia-sw=" in the URL and modify the URL so that it works with the rest of our logic
 */
function translateIpfsRedirectUrl (urlString: string): URL {
  const url = new URL(urlString)
  const heliaSw = url.searchParams.get('helia-sw')
  if (heliaSw != null) {
    url.searchParams.delete('helia-sw')
    url.pathname = heliaSw
  }
  return url
}
