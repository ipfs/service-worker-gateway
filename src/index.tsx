import { getStateFromUrl, getConfigRedirectUrl, getUrlWithConfig, loadConfigFromUrl } from './lib/first-hit-helpers.js'

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

  // if all else fails, render the UI
  await renderUi()
}

// if all else fails, dynamically render the App component
void main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('helia:sw-gateway:index: error rendering ui', err)
})
