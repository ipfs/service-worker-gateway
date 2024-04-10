/**
 * @file This file contains the ServiceWorkerProvider component which is used to register the service worker,
 * and provide the isServiceWorkerRegistered state to the rest of the app.
 *
 * URL / location logic dependent upon the service worker being registered should be handled here. Some examples of this are:
 *
 * Before the Service Worker is registered (e.g. first requests to root hosted domain or subdomains):
 *
 * 1. Being redirected from _redirects file to a ?helia-sw= url
 * 2. The app is loaded because service worker is not yet registered, we need to reload the page so the service worker intercepts the request
 *
 * After the service worker is loaded. Usually any react code isn't loaded, but some edge cases are:
 * 1. The page being loaded using some /ip[fn]s/<path> url, but subdomain isolation is supported, so we need to redirect to the isolated origin
 */
import React, { createContext, useEffect, useState } from 'preact/compat'
import { getRedirectUrl, isDeregisterRequest } from '../lib/deregister-request.js'
import { translateIpfsRedirectUrl } from '../lib/ipfs-hosted-redirect-utils.js'
import { error, trace } from '../lib/logger.js'
import { findOriginIsolationRedirect } from '../lib/path-or-subdomain.js'
import { registerServiceWorker } from '../service-worker-utils.js'

export const ServiceWorkerContext = createContext({
  isServiceWorkerRegistered: false
})

export const ServiceWorkerProvider = ({ children }): JSX.Element => {
  const [isServiceWorkerRegistered, setIsServiceWorkerRegistered] = useState(false)

  const windowLocation = translateIpfsRedirectUrl(window.location.href)

  useEffect(() => {
    if (isServiceWorkerRegistered) {
      /**
       * The service worker is registered, now we need to check for "helia-sw" and origin isolation support
       */
      if (windowLocation.href !== window.location.href) {
      /**
       * We're at a domain with ?helia-sw=, we can reload the page so the service worker will
       * capture the request
       */
        window.location.replace(windowLocation.href)
      } else {
        /**
         * ?helia-sw= url handling is done, now we can check for origin isolation redirects
         */
        void findOriginIsolationRedirect(windowLocation).then((originRedirect) => {
          if (originRedirect !== null) {
            window.location.replace(originRedirect)
          }
        })
      }
      /**
       * The service worker is registered, we don't need to do any more work
       */
      return
    }
    async function doWork (): Promise<void> {
      if (isDeregisterRequest(window.location.href)) {
        trace('UI: deregistering service worker')
        const registration = await navigator.serviceWorker.getRegistration()
        if (registration != null) {
          await registration.unregister()
          window.location.replace(getRedirectUrl(window.location.href).href)
        } else {
          error('UI: service worker not registered, cannot deregister')
        }
      }
      const registration = await navigator.serviceWorker.getRegistration()

      if (registration != null) {
        setIsServiceWorkerRegistered(true)
      } else {
        try {
          await registerServiceWorker()
          setIsServiceWorkerRegistered(true)
        } catch (err) {
          error('error registering service worker', err)
        }
      }
    }
    void doWork()
  }, [isServiceWorkerRegistered])

  return (
    <ServiceWorkerContext.Provider value={{ isServiceWorkerRegistered }}>
      {children}
    </ServiceWorkerContext.Provider>
  )
}
