import { uiLogger } from './lib/logger.js'

/**
 * This function is always and only used from the UI
 */
export async function registerServiceWorker (): Promise<ServiceWorkerRegistration> {
  const log = uiLogger.forComponent('register-service-worker')
  const swRegistration = await navigator.serviceWorker.register(new URL('ipfs-sw-sw.js', import.meta.url), {
    type: 'module'
  })
  return new Promise((resolve, reject) => {
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
