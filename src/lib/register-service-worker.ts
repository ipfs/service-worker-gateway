/**
 * This function is always and only used from the UI
 */
export async function registerServiceWorker (): Promise<ServiceWorkerRegistration> {
  const swRegistration = await navigator.serviceWorker.register(new URL(`${window.location.protocol}//${window.location.host}/ipfs-sw-sw.js`), {
    scope: '/'
  })

  // sw was registered immediately
  if (swRegistration.active?.state === 'activated') {
    return swRegistration
  }

  return new Promise((resolve, reject) => {
    swRegistration.addEventListener('updatefound', () => {
      const newWorker = swRegistration.installing
      newWorker?.addEventListener('statechange', () => {
        if (newWorker.state === 'activated') {
          resolve(swRegistration)
        }
      })
    })
  })
}
