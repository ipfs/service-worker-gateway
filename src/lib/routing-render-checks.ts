export async function shouldRenderConfigPage (): Promise<boolean> {
  const { isConfigPage } = await import('../lib/is-config-page.js')

  const isRequestToViewConfigPage = isConfigPage(window.location.hash)
  return isRequestToViewConfigPage
}

export function shouldRenderNoServiceWorkerError (): boolean {
  return !('serviceWorker' in navigator)
}

export async function shouldRenderSubdomainWarningPage (): Promise<boolean> {
  if (window.location.hash.startsWith('#/ipfs-sw-origin-isolation-warning')) {
    return true
  }

  return false
}

export async function shouldRenderFirstHitPage (): Promise<boolean> {
  return window.location.pathname.includes('ipfs-sw-first-hit')
}
