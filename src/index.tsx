import { getConfig, isConfigSet, setConfig } from './lib/config-db.js'
import { QUERY_PARAMS } from './lib/constants.js'
import { getSubdomainParts } from './lib/get-subdomain-parts.js'
import { uiLogger } from './lib/logger.js'
import { toSubdomainRequest } from './lib/path-or-subdomain.js'
import { translateIpfsRedirectUrl } from './lib/translate-ipfs-redirect-url.js'
import { registerServiceWorker } from './service-worker-utils.js'
import type { UrlParts } from './lib/get-subdomain-parts.js'
import { ensureSwScope } from './lib/first-hit-helpers.js'

interface NavigationState {
  subdomainHasConfig: boolean
  isIsolatedOrigin: boolean
  // urlHasConfig: boolean
  urlHasSubdomainConfigRequest: boolean
  url: URL
  subdomainParts: UrlParts,
  compressedConfig: string | null
}

async function getStateFromUrl (url: URL): Promise<NavigationState> {
  const { parentDomain, id, protocol } = getSubdomainParts(url.href)
  const isIsolatedOrigin = parentDomain != null && parentDomain !== url.host && id != null
  // const urlHasConfig = url.searchParams.get(QUERY_PARAMS.IPFS_SW_CFG) != null
  const urlHasSubdomainConfigRequest = url.searchParams.get(QUERY_PARAMS.IPFS_SW_SUBDOMAIN_REQUEST) != null && url.searchParams.get(QUERY_PARAMS.HELIA_SW) != null
  let subdomainHasConfig = false

  if (isIsolatedOrigin) {
    // check if indexedDb has config
    subdomainHasConfig = await isConfigSet(uiLogger)
  }

  return {
    subdomainHasConfig,
    isIsolatedOrigin,
    // urlHasConfig,
    urlHasSubdomainConfigRequest,
    url,
    subdomainParts: { parentDomain, id, protocol },
    compressedConfig: url.searchParams.get(QUERY_PARAMS.IPFS_SW_CFG)
  } satisfies NavigationState
}
/**
 * When landing on a subdomain page for the first time, we need to redirect to the root domain with a request for the config.
 *
 * This page and function will not run if the service worker is already registered on that subdomain.
 */
async function getConfigRedirectUrl ({ url, isIsolatedOrigin, urlHasSubdomainConfigRequest, compressedConfig, subdomainParts }: NavigationState): Promise<string | null> {
  const { parentDomain, id, protocol } = subdomainParts

  if (isIsolatedOrigin && !urlHasSubdomainConfigRequest && compressedConfig == null) {
    // We are on a subdomain: redirect to the root domain with the subdomain request query param
    const targetUrl = new URL(`${url.protocol}//${parentDomain}`)
    targetUrl.pathname = '/'
    targetUrl.hash = url.hash
    targetUrl.search = url.search
    targetUrl.searchParams.set(QUERY_PARAMS.IPFS_SW_SUBDOMAIN_REQUEST, 'true')
    targetUrl.searchParams.set(QUERY_PARAMS.HELIA_SW, `/${protocol}/${id}/${url.pathname}`)

    return targetUrl.toString()
  }

  return null
}

async function getUrlWithConfig ({ url, isIsolatedOrigin, urlHasSubdomainConfigRequest }: NavigationState): Promise<string | null> {
  const { compressConfig } = await import('./lib/config-db.js')
  const { uiLogger } = await import('./lib/logger.js')
  // const url = new URL(window.location.href)
  if (!isIsolatedOrigin && urlHasSubdomainConfigRequest) {
    // we are on the root domain, and have been requested by a subdomain to fetch the config and pass it back to them.
    const redirectUrl = url
    redirectUrl.searchParams.delete(QUERY_PARAMS.IPFS_SW_SUBDOMAIN_REQUEST)
    const config = await getConfig(uiLogger)
    const compressedConfig = await compressConfig(config)
    redirectUrl.searchParams.set(QUERY_PARAMS.IPFS_SW_CFG, compressedConfig)

    // translate the url with helia-sw to a path based URL, and then to the proper subdomain URL
    return toSubdomainRequest(translateIpfsRedirectUrl(redirectUrl))
  }

  return null
}

async function loadConfigFromUrl ({ url, compressedConfig }: NavigationState): Promise<string | null> {
  const { decompressConfig } = await import('./lib/config-db.js')
  if (compressedConfig == null) {
    return null
  }
  try {
    const config = await decompressConfig(compressedConfig)
    url.searchParams.delete(QUERY_PARAMS.IPFS_SW_CFG)
    await setConfig(config, uiLogger)
    await registerServiceWorker()
    return url.toString()
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('helia:sw-gateway:index: error decompressing config from url', err)
  }

  return null
}

async function renderUi (): Promise<void> {
  const { default: renderUi } = await import('./app.jsx')

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
