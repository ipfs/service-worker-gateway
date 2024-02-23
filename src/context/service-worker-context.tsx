import React, { createContext, useEffect, useState } from 'react'
import { error } from '../lib/logger.ts'
import { registerServiceWorker } from '../service-worker-utils.ts'

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
          const registration = await registerServiceWorker()
          await registration.update()
          setIsServiceWorkerRegistered(true)
        } catch (err) {
          error('error registering service worker', err)
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
