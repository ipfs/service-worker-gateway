import React from 'react'
import { registerServiceWorker } from '../service-worker-utils'

export const ServiceWorkerContext = React.createContext({
  isServiceWorkerRegistered: false
})

export const ServiceWorkerProvider = ({ children }): JSX.Element => {
  const [isServiceWorkerRegistered, setIsServiceWorkerRegistered] = React.useState(false)

  React.useEffect(() => {
    if (isServiceWorkerRegistered) {
      return
    }
    void registerServiceWorker().then(() => {
      // eslint-disable-next-line no-console
      console.log('config-debug: service worker registered', self.location.origin)
      setIsServiceWorkerRegistered(true)
    })
  }, [])

  return (
    <ServiceWorkerContext.Provider value={{ isServiceWorkerRegistered }}>
      {children}
    </ServiceWorkerContext.Provider>
  )
}
