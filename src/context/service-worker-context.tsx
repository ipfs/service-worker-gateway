import React, { createContext, useEffect, useState } from 'react'
import { registerServiceWorker } from '../service-worker-utils'

export const ServiceWorkerContext = createContext({
  isServiceWorkerRegistered: false
})

export const ServiceWorkerProvider = ({ children }): JSX.Element => {
  const [isServiceWorkerRegistered, setIsServiceWorkerRegistered] = useState(false)

  useEffect(() => {
    if (isServiceWorkerRegistered) {
      return
    }
    async function doWork (): Promise<void> {
      const registration = await navigator.serviceWorker.getRegistration()

      if (registration != null) {
        // service worker already registered
        // attempt to update it
        await registration.update()
        setIsServiceWorkerRegistered(true)
      } else {
        try {
          await registerServiceWorker()
          setIsServiceWorkerRegistered(true)
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('config-debug: error registering service worker', err)
        }
      }
    }
    void doWork()
  }, [])

  return (
    <ServiceWorkerContext.Provider value={{ isServiceWorkerRegistered }}>
      {children}
    </ServiceWorkerContext.Provider>
  )
}
