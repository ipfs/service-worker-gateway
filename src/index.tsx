import { getStateFromUrl, getConfigRedirectUrl, getUrlWithConfig, loadConfigFromUrl, ensureSwScope } from './lib/first-hit-helpers.js'
import { toSubdomainRequest } from './lib/path-or-subdomain.js'
import { translateIpfsRedirectUrl } from './lib/translate-ipfs-redirect-url.js'
import { registerServiceWorker } from './service-worker-utils.js'

async function renderUi (): Promise<void> {
  // dynamically load the app chunk using the correct filename
  try {
    // @ts-expect-error - App config is generated at build time
    const { APP_FILENAME } = await import('/ipfs-sw-app-config.js')

    const script = document.createElement('script')
    script.type = 'module'
    script.src = `/${APP_FILENAME}`
    //     script.textContent = `
    // import renderApp from '/${APP_CHUNK_FILENAME}';
    // renderApp();
    // console.log('import.meta.url', import.meta.url);
    // export {}
    // `
    document.body.appendChild(script)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to load app chunk config:', err)
    throw err
  }
}

async function main (): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    // no service worker, render the UI
    await renderUi()
    return
  }

  const url = new URL(window.location.href)
  const state = await getStateFromUrl(url)

  if (!state.requestForContentAddressedData) {
    // not a request for content addressed data, render the UI
    await renderUi()
    return
  } else if (state.hasConfig) {
    // user is requesting content addressed data and has the config already, render the UI
    await renderUi()
    return
  }
  // the user is requesting content addressed data and does not have the config, continue with the config loading flow

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
