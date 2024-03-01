import { log } from './lib/logger.ts'

export async function registerServiceWorker (): Promise<ServiceWorkerRegistration> {
  const swRegistration = await navigator.serviceWorker.register(new URL('sw.ts', import.meta.url))
  return new Promise((resolve, reject) => {
    // If we jsut registered a sw, why are we holidng off resolving this async function with another promise that resolves if an update has been found?
    swRegistration.addEventListener('updatefound', () => {
      const newWorker = swRegistration.installing
      newWorker?.addEventListener('statechange', () => {
        if (newWorker.state === 'activated') {
          log('service worker activated')
          resolve(swRegistration)
        }
      })
    })
  })
}
