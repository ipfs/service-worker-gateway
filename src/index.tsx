import { getStateFromUrl, getConfigRedirectUrl, getUrlWithConfig, loadConfigFromUrl, ensureSwScope } from './lib/first-hit-helpers.js'
import { toSubdomainRequest } from './lib/path-or-subdomain.js'
import { translateIpfsRedirectUrl } from './lib/translate-ipfs-redirect-url.js'
import { registerServiceWorker } from './service-worker-utils.js'

const loadingIndicatorElement = document.querySelector('.loading-indicator-js')
async function renderUi (): Promise<void> {
  // dynamically load the app chunk using the correct filename
  try {
    // @ts-expect-error - App config is generated at build time
    // eslint-disable-next-line import-x/no-absolute-path
    const { APP_FILENAME } = await import('/ipfs-sw-app-config.js')
    const script = document.createElement('script')
    script.type = 'module'
    script.src = `/${APP_FILENAME}`
    document.body.appendChild(script)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to load app chunk config:', err)
    throw err
  }
}

async function main (): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    // no service worker support, render the UI
    await renderUi()
    return
  }

  const url = new URL(window.location.href)
  const state = await getStateFromUrl(url)

  if (!state.requestForContentAddressedData || state.isConfigRequest) {
    // not a request for content addressed data, render the UI
    await renderUi()
    return
  } else if (state.hasConfig) {
    // user is requesting content addressed data and has the config already
    // we need to ensure a SW is registered and let it handle the request
    const translatedUrl = translateIpfsRedirectUrl(url)
    if (state.isHardRefresh) {
      // this is a hard refresh, we need to reload to ensure the service worker captures the request.
      window.location.replace(translatedUrl.href) // replace with translated URL to remove helia-sw param
      return
    }
    // else, there is some other reason why sw didn't capture the request, ensure sw is registered and reload
    try {
      await ensureSwScope()
      await registerServiceWorker()
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('helia:sw-gateway:index: error ensuring sw scope and registration', err)
    }
    window.location.replace(translatedUrl.href) // replace with translated URL to remove helia-sw param
    return
  }

  /**
   * **********************************************
   * From here on, we are handling the case where:
   * - the user is requesting content addressed data
   * - the user does not have the config
   *
   * We need to load the config, which may involve a redirect to the root domain
   * before the service worker can be registered
   * ***********************************************
   */
  loadingIndicatorElement?.classList.remove('hidden')

  if (state.hasConfig && state.isIsolatedOrigin) {
    // we are on a subdomain, and have a config, the service worker should be rendering the content shortly.
    // TODO: this implicitly assumes the service worker is registered because config is set.. which should be true, but we should be more explicit.
    return
  }

  const configRedirectUrl = await getConfigRedirectUrl(state)
  if (configRedirectUrl != null) {
    window.location.replace(configRedirectUrl)
    return
  }

  const configForUri = await getUrlWithConfig(state)
  if (configForUri != null) {
    window.location.replace(configForUri)
    return
  }

  const urlAfterLoadingConfig = await loadConfigFromUrl(state)
  if (urlAfterLoadingConfig != null) {
    window.location.replace(urlAfterLoadingConfig)
    return
  }

  // if we are not on a subdomain, but we should be, we need to redirect to the subdomain
  await ensureSwScope()
  await registerServiceWorker()

  const translatedUrl = translateIpfsRedirectUrl(url)
  let actualContentUrl: string
  if (state.supportsSubdomains) {
    actualContentUrl = toSubdomainRequest(translatedUrl)
  } else {
    actualContentUrl = translatedUrl.href
  }

  window.location.replace(actualContentUrl)
}

void main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('helia:sw-gateway:index: error rendering ui', err)
})
