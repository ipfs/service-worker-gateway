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

/**
 * Waits for a service worker to reach the 'activated' state.
 *
 * The naive approach of only listening for 'updatefound' has edge cases that
 * can leave users stuck on a loading screen forever:
 *
 * 1. Race condition: a worker may already be in 'installing' or 'waiting' state
 * when we start listening, so we'd miss the activation event.
 *
 * 2. Silent failures: if a worker becomes 'redundant' (e.g., replaced by a
 * newer version mid-install), we need to detect this and fail explicitly.
 *
 * 3. Indefinite hangs: without a timeout, a stuck worker activation would
 * hang the page forever with no feedback.
 *
 * To handle these, we track all existing workers (installing, waiting, active)
 * plus any new ones via 'updatefound', use a settled flag to prevent double
 * resolution, and enforce a 30-second timeout with a clear error message.
 */
async function waitForActivation (swRegistration: ServiceWorkerRegistration): Promise<ServiceWorkerRegistration> {
  return new Promise((resolve, reject) => {
    let settled = false

    const succeed = (): void => {
      if (settled) { return }
      settled = true
      clearTimeout(timeoutId)
      resolve(swRegistration)
    }

    const fail = (msg: string): void => {
      if (settled) { return }
      settled = true
      clearTimeout(timeoutId)
      reject(new Error(msg))
    }

    const timeoutId = setTimeout(() => {
      fail('Service worker failed to activate within 30 seconds. Refresh the page to retry.')
    }, 30_000)

    const trackWorker = (sw: ServiceWorker | null): void => {
      if (sw == null) { return }
      sw.addEventListener('statechange', () => {
        if (sw.state === 'activated') { succeed() } else if (sw.state === 'redundant') { fail('Service worker became redundant. Refresh the page to retry.') }
      })
      if (sw.state === 'activated') { succeed() }
    }

    trackWorker(swRegistration.installing)
    trackWorker(swRegistration.waiting)
    trackWorker(swRegistration.active)
    swRegistration.addEventListener('updatefound', () => {
      trackWorker(swRegistration.installing)
    })
  })
}
