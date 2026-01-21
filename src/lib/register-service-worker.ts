/**
 * This function is always and only used from the UI
 */
export async function registerServiceWorker (): Promise<ServiceWorkerRegistration> {
  const swRegistration = await navigator.serviceWorker.register(new URL('ipfs-sw-sw.js', import.meta.url), {
    scope: '/'
  })

  if (swRegistration.active?.state === 'activated') {
    return swRegistration
  }

  return waitForActivation(swRegistration)
}

async function waitForActivation (swRegistration: ServiceWorkerRegistration): Promise<ServiceWorkerRegistration> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Service worker failed to activate within 30 seconds. Refresh the page to retry.'))
    }, 30_000)

    const onStateChange = (e: Event): void => {
      const sw = e.target as ServiceWorker
      if (sw.state === 'activated') {
        clearTimeout(timeoutId)
        resolve(swRegistration)
      } else if (sw.state === 'redundant') {
        clearTimeout(timeoutId)
        reject(new Error('Service worker became redundant. Refresh the page to retry.'))
      }
    }

    // track workers that may already be installing or waiting
    swRegistration.installing?.addEventListener('statechange', onStateChange)
    swRegistration.waiting?.addEventListener('statechange', onStateChange)
    swRegistration.addEventListener('updatefound', () => {
      swRegistration.installing?.addEventListener('statechange', onStateChange)
    })
  })
}
