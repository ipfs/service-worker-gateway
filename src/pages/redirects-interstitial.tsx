import React, { useEffect } from 'react'
import { findOriginIsolationRedirect } from '../lib/path-or-subdomain.js'
import { translateIpfsRedirectUrl } from '../lib/translate-ipfs-redirect-url.js'
import RedirectPage from './redirect-page.jsx'

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
    /**
     * We're waiting for the subdomain check to complete.. this will look like a FOUC (Flash Of Unstyled Content) when
     * the assets are quickly loaded, but are informative to users when loading of assets is slow.
     *
     * TODO: Better styling.
     */
    return (<>First-hit on IPFS hosted service-worker-gateway. Determining state...</>)
  }

  if (subdomainRedirectUrl == null) {
    /**
     * We now render the redirect page if ?helia-sw is observed and subdomain redirect is not required., but not by
     * conflating logic into the actual RedirectPage component.
     *
     * However, the url in the browser for this scenario will be "<domain>/?helia-sw=/ipfs/blah", and the RedirectPage
     * will update that URL when the user clicks "load Content" to "<domain>/ipfs/blah".
     */
    return <RedirectPage />
  }

  /**
   * If we redirect to a subdomain, this page will not be rendered again for the requested URL. The `RedirectPage`
   * component will render directly.
   *
   * This page should also not render again for any subsequent unique urls because the SW is registered and would
   * trigger the redirect logic, which would then load RedirectPage if a "first-hit" for that subdomain.
   *
   * TODO: Better styling.
   */
  return <>Waiting for redirect to subdomain...</>
}
