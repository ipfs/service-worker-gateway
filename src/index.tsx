import { QUERY_PARAMS } from './lib/constants.js'
import { getStateFromUrl } from './lib/first-hit-helpers.js'
import { registerServiceWorker } from './service-worker-utils.js'

/**
 * Asynchronously loads and shows the UI - this is to make the number of bytes
 * downloaded before the service worker is installed smaller
 */
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

/**
 * The `index.html` page is loaded either directly (e.g. `http://localhost:1234`
 * or `http://bafyfoo.ipfs.localhost:1234`)
 * or via an internal redirect (e.g. `http://localhost:1234/ipfs/bafyfoo` or
 * `http://bafyfoo.ipfs.localhost:1234/bar/baz`).
 *
 * A direct load means we need to install the service worker and then either
 * show the UI (if it was explicitly requested/it was a non-subdomain gateway
 * request) or redirect the user to an onward page (either due to the presence
 * of the `helia-sw` param or if it was a subdomain gateway request).
 *
 * An indirect load means we need to install the service worker and then
 * redirect.
 *
 * In both cases we need to write the config into IndexedDB if present.
 *
 * If loaded directly or indirectly:
 *
 * 1. Check for service worker support
 * - If not found, render the UI which will show an error
 * 2. Check for pre-existing config
 * - If not found, initialize using contents of `QUERY_PARAMS.CONFIG` param or defaults
 * 3. Check for service worker
 * - If not found, initialize service worker
 *
 * If loaded directly
 *
 * This means we are either about to redirect back to a path/subdomain gateway
 * or show the UI
 *
 * 1. Check `QUERY_PARAMS.REDIRECT` param
 * - If present
 * - - Check `helia-get-config` param
 * - - - If present, load config, compress and add to redirect URL
 * - - Redirect to param value
 * - Otherwise show service worker UI
 *
 * If loaded indirectly:
 *
 * This means a subdomain or path gateway request was made but the service
 * worker was not installed (as it would have intercepted the request).
 *
 * 1. If the request is for a path gateway:
 * - Detect subdomain support
 * - - If present, redirect to subdomain gateway URL
 * - - If not present, detect whether origin isolation warning has been accepted
 * - - - If accepted encode current URL as `helia-sw` and redirect to domain root
 * - - - If not accepted, show origin isolation warning UI
 * 2. Otherwise if the request is for a subdomain gateway
 * - Check `helia-config` param, if present, deserialize and write into IndexedDB
 *
 * -------
 *
 * Maybe we are done?
 */
async function main (): Promise<void> {
  const url = new URL(window.location.href)
  const state = await getStateFromUrl(url)

  if (!('serviceWorker' in navigator)) {
    // no service worker support, render the UI which will tell the user service
    // workers are not supported
    await renderUi()
    return
  }

  // check service worker state
  const registration = await navigator.serviceWorker.getRegistration()

  if (registration?.active == null) {
    // install the service worker on the root path of this domain, either path
    // or subdomain gateway
    await registerServiceWorker()
  }

  let redirectTo = url.searchParams.get(QUERY_PARAMS.REDIRECT)

  if (redirectTo != null) {
    const includeConfig = url.searchParams.get(QUERY_PARAMS.GET_CONFIG)

    // append config to the redirect if requested
    if (includeConfig === 'true') {
      const redirectUrl = new URL(redirectTo)
      redirectUrl.searchParams.set(QUERY_PARAMS.CONFIG, await state.config.getCompressed())

      redirectTo = `${redirectUrl.protocol}//${redirectUrl.host}${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`
    }

    window.location.href = redirectTo
    return
  }

  // no redirect requested, no content requested, show UI
  if (!state.requestForContentAddressedData) {
    await renderUi()
    return
  }

  // service worker is now installed so redirect to path or subdomain for data
  // so it can intercept the request

  window.location.href = url.toString()
}

void main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('helia:sw-gateway:index: error rendering ui', err)
})
