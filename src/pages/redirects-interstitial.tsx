import React, { useEffect } from 'preact/compat'
import { findOriginIsolationRedirect } from '../lib/path-or-subdomain.js'
import { translateIpfsRedirectUrl } from '../lib/translate-ipfs-redirect-url.js'
import RedirectPage from './redirect-page'

/**
 * This page is only used to capture the ?helia-sw=/ip[fn]s/blah query parameter that
 * is used by IPFS hosted versions of the service-worker-gateway when non-existent paths are requested.
 * This will only redirect if the URL is for a subdomain
 */
export default function RedirectsInterstitial (): React.JSX.Element {
  const [subdomainRedirectUrl, setSubdomainRedirectUrl] = React.useState<string | null>(null)
  const [isSubdomainCheckDone, setIsSubdomainCheckDone] = React.useState<boolean>(false)
  useEffect(() => {
    async function doWork (): Promise<void> {
      setSubdomainRedirectUrl(await findOriginIsolationRedirect(translateIpfsRedirectUrl(window.location.href)))
      setIsSubdomainCheckDone(true)
    }
    void doWork()
  })

  useEffect(() => {
    if (subdomainRedirectUrl != null && window.location.href !== subdomainRedirectUrl) {
      /**
       * We're at a domain with ?helia-sw=, we can reload the page so the service worker will
       * capture the request
       */
      window.location.replace(subdomainRedirectUrl)
    }
  }, [subdomainRedirectUrl])

  if (!isSubdomainCheckDone) {
    return (<>First-hit on IPFS hosted service-worker-gateway. Determining state...</>)
  }

  if (subdomainRedirectUrl == null) {
    return <RedirectPage />
  }

  return <>Waiting for redirect to subdomain...</>
}
