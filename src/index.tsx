// import { getStateFromUrl, getConfigRedirectUrl, getUrlWithConfig, loadConfigFromUrl } from './lib/first-hit-helpers.js'
import { translateIpfsRedirectUrl } from './lib/translate-ipfs-redirect-url.js'
import { ensureSwScope } from './lib/first-hit-helpers.js'
import { registerServiceWorker } from './service-worker-utils.js'

async function renderUi (): Promise<void> {
  const { default: renderUi } = await import('./app.jsx')
  // const { ensureSwScope } = await import('./lib/first-hit-helpers.js')

  await ensureSwScope()
  renderUi()
}

// function isRequestForContentAddressedData (url: URL): boolean {
//   const validContentRequestTypes = ['ipfs', 'ipns']
//   if (validContentRequestTypes.some(contentRequestType => url.host.includes(contentRequestType))) {
//     // subdomain request
//     return true
//   }
//   if (validContentRequestTypes.some(contentRequestType => url.pathname.includes(contentRequestType))) {
//     // pathname request
//     return true
//   }
//   if (url.searchParams.has('helia-sw')) {
//     // query param request
//     return true
//   }
//   if (url.hash.includes('/ipfs-sw-config')) {
//     // hash request for config page.
//     return true
//   }
//   return false
// }

async function main (): Promise<void> {
  const url = new URL(window.location.href)
  // const state = await getStateFromUrl(url)

  // if (state.subdomainHasConfig && state.isIsolatedOrigin) {
  //   // we are on a subdomain, and have a config, the service worker should be rendering the content shortly.
  //   return
  // }

  // if (!isRequestForContentAddressedData(url)) {
  //   console.log('isRequestForContentAddressedData: false, rendering the UI')
  //   // render the UI
  //   await renderUi()
  //   return
  // }


  if (url.searchParams.has('helia-sw')) {
    // path should be empty, and we should be registering the service worker.
    await registerServiceWorker()
    const translatedUrl = await translateIpfsRedirectUrl(url)
    console.log('translatedUrl: ', translatedUrl.href)
    window.location.replace(translatedUrl.href)
  }


  // const configRedirectUrl = await getConfigRedirectUrl(state)
  // if (configRedirectUrl != null) {
  //   window.location.replace(configRedirectUrl)
  //   return
  // }

  // const configForUri = await getUrlWithConfig(state)
  // if (configForUri != null) {
  //   window.location.replace(configForUri)
  //   return
  // }

  // const urlAfterLoadingConfig = await loadConfigFromUrl(state)
  // if (urlAfterLoadingConfig != null) {
  //   window.location.replace(urlAfterLoadingConfig)
  //   return
  // }


}

void main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('helia:sw-gateway:index: error rendering ui', err)
}).finally(() => {
  console.log('helia:sw-gateway:index: finally')
})
