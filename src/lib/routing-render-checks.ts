import { HASH_FRAGMENTS } from './constants.js'
import { hasHashFragment } from './hash-fragments.js'

export async function shouldRenderConfigPage (): Promise<boolean> {
  const { isConfigPage } = await import('../lib/is-config-page.js')

  const isRequestToViewConfigPage = isConfigPage(window.location.hash)
  return isRequestToViewConfigPage
}

export function shouldRenderNoServiceWorkerError (): boolean {
  return !('serviceWorker' in navigator)
}

export async function shouldRenderSubdomainWarningPage (): Promise<boolean> {
  const url = new URL(window.location.href)

  return hasHashFragment(url, HASH_FRAGMENTS.ORIGIN_ISOLATION_WARNING)
}

export async function shouldRenderFirstHitPage (): Promise<boolean> {
  return window.location.pathname.includes('ipfs-sw-first-hit')
}
