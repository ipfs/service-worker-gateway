import weald from 'weald'
import { config } from './config/index.ts'
import { QUERY_PARAMS } from './lib/constants.ts'
import { isUIPageRequest } from './lib/is-ui-page-request.ts'
import { isPathGatewayRequest, isPathOrSubdomainRequest, isSafeOrigin, isSubdomainGatewayRequest, toSubdomainRequest } from './lib/path-or-subdomain.ts'
import { registerServiceWorker } from './lib/register-service-worker.ts'

weald.enable(config.debug)

declare global {
  var originIsolationWarning: {
    location: string
  }
}

/**
 * The `index.html` page is loaded either as the root domain (e.g.
 * `http://localhost:1234`), a path gateway request (e.g.
 * `http://localhost:1234/ipfs/bafyfoo`)
 *  or as subdomain request (e.g. `http://bafyfoo.ipfs.localhost:1234/bar/baz`).
 *
 * If the root domain was requested with a path gateway path (e.g. `/ipfs/Qmfoo`
 * or `/ipns/Qmfoo`) we need to redirect the user to a subdomain to load the
 * content, otherwise we show the UI.
 *
 * If it's a subdomain request we need to install the service worker, then
 * reload the current page so the request can be handled by the service worker.
 */
async function main (): Promise<void> {
  try {
    if (!('serviceWorker' in navigator)) {
      // no service worker support, render the UI which will tell the user
      // service workers are not supported
      await renderUi()
      return
    }

    const url = new URL(window.location.href)

    // special case - if the user has loaded loopback, redirect to localhost
    if (url.hostname === '127.0.0.1') {
      url.hostname = 'localhost'
      window.location.href = url.href
      return
    }

    // only support access via domain names - IP addresses cannot support origin
    // isolation so are unsafe to use
    if (!isSafeOrigin(url)) {
      globalThis.originIsolationWarning = {
        location: window.location.href
      }
      await renderUi()
      return
    }

    // make sure we don't redirect endlessly
    if (tooManyRedirects(`ipfs-sw-${window.location.href}-redirects`)) {
      globalThis.serverError = {
        url: window.location.href,
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

    if (!isSubdomainGatewayRequest(url)) {
      // if we are on the root origin, register custom handlers for ipfs:// and
      // ipns:// URLs
      try {
        navigator.registerProtocolHandler('ipfs', `${url.protocol}//${url.host}/ipfs/?uri=%s`)
        navigator.registerProtocolHandler('ipns', `${url.protocol}//${url.host}/ipns/?uri=%s`)
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('could not register protocol handlers', err)
      }

      // redirect if we are being invoked as a URI router
      // @see https://specs.ipfs.tech/http-gateways/subdomain-gateway/#uri-router
      if ((url.pathname === '/ipfs/' || url.pathname === '/ipns/') && url.searchParams.has(QUERY_PARAMS.URI_ROUTER)) {
        try {
          const uri = new URL(url.searchParams.get(QUERY_PARAMS.URI_ROUTER) ?? '')
          window.location.href = `/${uri.protocol.substring(0, 4)}/${uri.hostname}${uri.pathname}${uri.search}${uri.hash}`
          return
        } catch {}
      }

      if (isPathGatewayRequest(url)) {
        // redirect to subdomain
        window.location.href = toSubdomainRequest(url).toString()
        return
      }

      await renderUi()
    } else {
      // we are on a subdomain, ensure the service worker is installed
      const registration = await navigator.serviceWorker.getRegistration()
      const hasActiveWorker = registration?.active != null

      if (!hasActiveWorker) {
        // install the service worker on the root path of this domain, either
        // path or subdomain gateway
        await registerServiceWorker()

        // service worker is now installed so redirect to path or subdomain for
        // data so it can intercept the request
        window.location.href = url.toString()
        return
      }
    }
  } catch (err: any) {
    // error during initialization, show an error message
    globalThis.serverError = {
      url: document.location.href,
      title: 'Installation Error',
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
  }

  await renderUi()
}

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

export function isRequestForContentAddressedData (url: URL): boolean {
  if (isUIPageRequest(url)) {
    // hash request for UI pages, not content addressed data
    return false
  }

  if (isPathOrSubdomainRequest(url)) {
    // subdomain request
    return true
  }

  return false
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('helia:sw-gateway:index: error rendering ui', err)
  })
