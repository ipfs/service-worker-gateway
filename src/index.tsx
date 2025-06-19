import { HASH_FRAGMENTS } from './lib/constants.js'
import { getStateFromUrl, getConfigRedirectUrl, getUrlWithConfig, loadConfigFromUrl } from './lib/first-hit-helpers.js'
import { hasHashFragment } from './lib/hash-fragments.js'

async function renderUi (): Promise<void> {
  const { default: renderUi } = await import('./app.jsx')
  const { ensureSwScope } = await import('./lib/first-hit-helpers.js')

  await ensureSwScope()
  renderUi()
}

async function main (): Promise<void> {
  const url = new URL(window.location.href)
  const state = await getStateFromUrl(url)

  if (state.subdomainHasConfig && state.isIsolatedOrigin) {
    // we are on a subdomain, and have a config
    await renderUi()
    return
  }

  const configRedirectUrl = await getConfigRedirectUrl(state)
  if (configRedirectUrl != null) {
    const url = new URL(configRedirectUrl)
    window.location.hash = url.hash
    window.location.replace(url.toString())
    return
  }

  const configForUri = await getUrlWithConfig(state)
  if (configForUri != null) {
    const url = new URL(configForUri)
    window.location.hash = url.hash
    window.location.replace(url.toString())
    return
  }

  const urlAfterLoadingConfig = await loadConfigFromUrl(state)
  if (urlAfterLoadingConfig != null) {
    const url = new URL(urlAfterLoadingConfig)
    window.location.hash = url.hash
    window.location.replace(url.toString())
    if (url.hash.includes(HASH_FRAGMENTS.VIEW_CONFIG_PAGE)) {
      return main()
    }
    return
  }

  if (state.heliaSw != null && url.pathname === '/' && !state.supportsSubdomains && !hasHashFragment(url, HASH_FRAGMENTS.ORIGIN_ISOLATION_WARNING)) {
    const { registerServiceWorker } = await import('./service-worker-utils.js')
    const { translateIpfsRedirectUrl } = await import('./lib/translate-ipfs-redirect-url.js')
    // we are on the root domain, and have a helia-sw parameter
    // we need to register the service worker at this root domain, and then translate the helia-sw parameter to the pathname
    await registerServiceWorker()
    const translatedUrl = translateIpfsRedirectUrl(url)
    window.location.hash = translatedUrl.hash
    window.location.replace(translatedUrl.toString())
    return
  }

  // similar to getConfigRedirectUrl, except we are on the root domain and need to redirect to the subdomain
  // TODO: this is the same as the above, so we can merge them.
  if (state.heliaSw != null && url.pathname === '/' && state.supportsSubdomains && !hasHashFragment(url, HASH_FRAGMENTS.ORIGIN_ISOLATION_WARNING)) {
    const { registerServiceWorker } = await import('./service-worker-utils.js')
    const { translateIpfsRedirectUrl } = await import('./lib/translate-ipfs-redirect-url.js')
    // we are on a subdomain, and have a helia-sw parameter, but subdomains are not supported
    // we need to register the service worker at this root domain, and then translate the helia-sw parameter to the pathname
    await registerServiceWorker()
    const translatedUrl = translateIpfsRedirectUrl(url)
    window.location.hash = translatedUrl.hash
    window.location.replace(translatedUrl.toString())
    return
  }

  // if all else fails, render the UI
  await renderUi()
}

// if all else fails, dynamically render the App component
void main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('helia:sw-gateway:index: error rendering ui', err)
})
