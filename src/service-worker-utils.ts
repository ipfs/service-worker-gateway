import { uiLogger } from './lib/logger.js'

async function supportsESMInServiceWorkers (): Promise<ServiceWorkerRegistration | null> {
  try {
    const scriptURL = new URL('ipfs-sw-sw.js', import.meta.url)
    const registration = await navigator.serviceWorker.register(scriptURL, {
      type: 'module',
      // don't use the cache for this registration
      updateViaCache: 'none'
    })
    return registration
  } catch (e) {
    return null
  }
}

/**
 * This function is always and only used from the UI
 */
export async function registerServiceWorker (): Promise<ServiceWorkerRegistration> {
  const log = uiLogger.forComponent('register-service-worker')
  const esmRegistration = await supportsESMInServiceWorkers()
  const swToLoad = (esmRegistration != null) ? 'ipfs-sw-sw.js' : 'ipfs-sw-sw-es5.js'
  const swUrl = new URL(swToLoad, import.meta.url)
  log.trace('loading service worker', swToLoad)
  const currentRegistration = await navigator.serviceWorker.getRegistration()
  if (currentRegistration != null) {
    const currentScriptURL = currentRegistration.active?.scriptURL ?? currentRegistration.waiting?.scriptURL ?? currentRegistration.installing?.scriptURL

    // If the current service worker is different, unregister it
    if (currentScriptURL !== swUrl.href) {
      log('unregistering old service worker', currentScriptURL)
      await currentRegistration.unregister()
    }
  }
  const swRegistration = esmRegistration ?? await navigator.serviceWorker.register(swUrl, {
    type: 'classic',
    updateViaCache: 'none'
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
