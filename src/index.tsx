import { checkSubdomainSupport } from './lib/check-subdomain-support.js'
import { Config } from './lib/config-db.js'
import { QUERY_PARAMS } from './lib/constants.js'
import { createSearch, isRequestForContentAddressedData } from './lib/first-hit-helpers.js'
import { uiLogger } from './lib/logger.js'
import { registerServiceWorker } from './lib/register-service-worker.js'

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
 * of the `QUERY_PARAMS.REDIRECT` param or if it was a subdomain gateway
 * request).
 *
 * An indirect load means we need to install the service worker and then
 * redirect.
 *
 * In both cases we need to write the config into IndexedDB if not present.
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
 * - - - If accepted encode current URL as `QUERY_PARAMS.REDIRECT` and redirect to domain root
 * - - - If not accepted, show origin isolation warning UI
 * 2. Otherwise if the request is for a subdomain gateway
 * - Check `helia-config` param, if present, deserialize and write into IndexedDB
 */
async function main (): Promise<void> {
  try {
    if (!('serviceWorker' in navigator)) {
      // no service worker support, render the UI which will tell the user service
      // workers are not supported
      await renderUi()
      return
    }

    let url = new URL(window.location.href)

    const config = new Config({
      logger: uiLogger
    }, {
      url
    })
    await config.init()

    // check for subdomain support if we have not already so service worker will
    // know it can redirect path gateway requests to subdomains
    if ((await config.areSubdomainsSupported() == null)) {
      await checkSubdomainSupport(url, config)
    }

    if (url.searchParams.get(QUERY_PARAMS.CONFIG) && document.referrer === '') {
      // someone has been linked to this page directly with config - if the
      // timestamp field is present, delete it to cause the config to become
      // untrusted which will reduce the number of fields allowed to be updated
      try {
        const uncompressed = JSON.parse(atob(url.searchParams.get(QUERY_PARAMS.CONFIG) ?? ''))
        delete uncompressed.t
        const compressed = btoa(JSON.stringify(uncompressed))

        const search = createSearch(url.searchParams, {
          filter: (key) => key !== QUERY_PARAMS.CONFIG,
          params: {
            [QUERY_PARAMS.CONFIG]: compressed
          }
        })

        url = new URL(`${url.protocol}//${url.host}${url.pathname}${search}${url.hash}`)
      } catch {}
    }

    const registration = await navigator.serviceWorker.getRegistration()
    const hasActiveWorker = registration?.active != null

    if (!hasActiveWorker) {
      // install the service worker on the root path of this domain, either path
      // or subdomain gateway
      await registerServiceWorker()
    }

    let redirectTo = url.searchParams.get(QUERY_PARAMS.REDIRECT)

    // perform redirect, if requested
    if (redirectTo != null) {
      const includeConfig = url.searchParams.get(QUERY_PARAMS.GET_CONFIG)

      // append config to the redirect if requested
      if (includeConfig === 'true') {
        const redirectUrl = new URL(redirectTo)

        // remove config request param from search
        const search = createSearch(redirectUrl.searchParams, {
          params: {
            [QUERY_PARAMS.CONFIG]: await config.getCompressed()
          },
          filter: (key) => key !== QUERY_PARAMS.GET_CONFIG && key !== QUERY_PARAMS.REDIRECT
        })

        redirectTo = `${redirectUrl.protocol}//${redirectUrl.host}${redirectUrl.pathname}${search}${redirectUrl.hash}`
      }

      window.location.href = redirectTo
      return
    }

    // no content requested, show UI
    if (!isRequestForContentAddressedData(url)) {
      await renderUi()
      return
    }

    const href = url.toString()

    // make sure we don't redirect endlessly
    if (tooManyRedirects(`ipfs-sw-${href}-redirects`)) {
      globalThis.serverError = {
        url: href,
        title: '310 Too many redirects',
        description: [
          'The initialization page reloaded itself too many times.',
          'This can mean the service worker failed to install, it was invalid or it cannot run.'
        ],
        error: {
          name: 'TooManyRedirects',
          message: 'The current page redirected too many times'
        },
        logs: []
      }

      await renderUi()
      return
    }

    // service worker is now installed so redirect to path or subdomain for data
    // so it can intercept the request
    window.location.href = url.toString()
  } catch (err: any) {
    // error during initialization, show an error message
    globalThis.serverError = {
      url: document.location.href,
      title: '500 Server Error',
      description: 'An error occurred while trying to install the service worker.',
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack,
        reason: err.reason,
        code: err.code,
        cause: err.cause,
        errors: err.errors
      },
      logs: []
    }

    await renderUi()
  }
}

void main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('helia:sw-gateway:index: error rendering ui', err)
})

/**
 * If we accidentally install an invalid service worker we will get stuck in an
 * endless loop of redirects, so count the number of times we have redirected to
 * this page and halt the redirects if we do it too many times.
 */
function tooManyRedirects (storageKey: string, maxRedirects = 5, period = 5_000): boolean {
  // we are not redirecting if the user followed a link here
  if (document.referrer !== document.location.href) {
    return false
  }

  const str = localStorage.getItem(storageKey)
  const redirects: number[] = []

  if (str != null) {
    try {
      const stored = JSON.parse(str)

      if (Array.isArray(stored)) {
        stored.forEach(val => {
          if (!isNaN(val)) {
            redirects.push(val)
          }
        })
      }
    } catch {}
  }

  // ignore any redirects from before ${period}s
  const cutOff = Date.now() - period
  const recent = redirects.filter(val => val > cutOff)

  // store the current redirect
  recent.push(Date.now())
  localStorage.setItem(storageKey, JSON.stringify(recent))

  return recent.length > maxRedirects
}
