/**
 * @file This file contains the ServiceWorkerProvider component which is used to register the service worker,
 * and provide the isServiceWorkerRegistered state to the rest of the app.
 *
 * URL / location logic dependent upon the service worker being registered should be handled here. Some examples of this are:
 *
 * Before the Service Worker is registered (e.g. first requests to root hosted domain or subdomains):
 *
 * 1. The app is loaded because service worker is not yet registered, we need to reload the page so the service worker intercepts the request
 *
 * After the service worker is loaded. Usually any react code isn't loaded, but some edge cases are:
 * 1. The page being loaded using some /ip[fn]s/<path> url, but subdomain isolation is supported, so we need to redirect to the isolated origin
 */
import React, { createContext, useEffect, useState, type ReactElement } from 'react'
import { getRedirectUrl, isDeregisterRequest } from '../lib/deregister-request.js'
import { ensureSwScope } from '../lib/first-hit-helpers.js'
import { uiLogger } from '../lib/logger.js'
import { findOriginIsolationRedirect } from '../lib/path-or-subdomain.js'
import { registerServiceWorker } from '../service-worker-utils.js'

const log = uiLogger.forComponent('service-worker-context')

export const ServiceWorkerContext = createContext({
  isServiceWorkerRegistered: false
})

export const ServiceWorkerProvider = ({ children }): ReactElement => {
  const [isServiceWorkerRegistered, setIsServiceWorkerRegistered] = useState(false)

  useEffect(() => {
    if (isServiceWorkerRegistered) {
      void findOriginIsolationRedirect(window.location, uiLogger).then((originRedirect) => {
        if (originRedirect !== null) {
          window.location.replace(originRedirect)
        }
      })

      /**
       * The service worker is registered, we don't need to do any more work
       */
      return
    }
    async function doWork (): Promise<void> {
      if (isDeregisterRequest(window.location.href)) {
        log.trace('deregistering service worker')
        const registration = await navigator.serviceWorker.getRegistration()
        if (registration != null) {
          await registration.unregister()
          window.location.replace(getRedirectUrl(window.location.href).href)
        } else {
          log.error('service worker not registered, cannot deregister')
        }
      }

      // This should have already been handled, but we'll do it again to be safe
      await ensureSwScope()

      const registration = await navigator.serviceWorker.getRegistration()

      if (registration != null) {
        setIsServiceWorkerRegistered(true)
      } else {
        try {
          await registerServiceWorker()
          setIsServiceWorkerRegistered(true)
        } catch (err) {
          log.error('error registering service worker', err)
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
