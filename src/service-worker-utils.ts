import { uiLogger } from './lib/logger.js'

async function supportsESMInServiceWorkers (): Promise<ServiceWorkerRegistration | null> {
  try {
    const scriptURL = new URL('ipfs-sw-sw.js', import.meta.url)
    const registration = await navigator.serviceWorker.register(scriptURL, { type: 'module', updateViaCache: 'imports' })
    // await registration.unregister()
    console.log('supportsESMInServiceWorkers', registration)
    return registration
  } catch (e) {
    console.error('error', e)
    return null
  }
}
/**
 * This function is always and only used from the UI
 */
export async function registerServiceWorker (): Promise<ServiceWorkerRegistration> {
  const log = uiLogger.forComponent('register-service-worker')
  const esmRegistration = await supportsESMInServiceWorkers()
  console.log('esmRegistration', esmRegistration)
  const swToLoad = (esmRegistration != null) ? 'ipfs-sw-sw.js' : 'ipfs-sw-sw-es5.js'
  const swUrl = new URL(swToLoad, import.meta.url)
  log.trace('loading service worker', swToLoad)
  const currentRegistration = await navigator.serviceWorker.getRegistration()
  if (currentRegistration != null) {
    currentRegistration.addEventListener('updatefound', () => {
      console.log('update found 1')
    })
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
      console.log('update found 2')
      const newWorker = swRegistration.installing
      console.log('newWorker', newWorker)
      newWorker?.addEventListener('statechange', () => {
        if (newWorker.state === 'activated') {
          log('service worker activated')
          resolve(swRegistration)
        }
      })
    })
  })
}
