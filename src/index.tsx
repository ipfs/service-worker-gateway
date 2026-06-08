/* eslint-disable max-depth */

import weald from 'weald'
import { config } from './config/index.ts'
import { QUERY_PARAMS } from './lib/constants.ts'
import { isBrowserSupported } from './lib/is-browser-supported.ts'
import { parseRequest } from './lib/parse-request-cheap.ts'
import { isSafeOrigin } from './lib/path-or-subdomain.ts'
import { registerServiceWorker } from './lib/register-service-worker.ts'
import type { ResolvableURI } from './lib/parse-request-cheap.ts'

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
 * or as subdomain request (e.g. `http://bafyfoo.ipfs.localhost:1234/bar/baz`).
 *
 * If the root domain was requested with a path gateway path (e.g. `/ipfs/Qmfoo`
 * or `/ipns/Qmfoo`) we need to redirect the user to a subdomain to load the
 * content, otherwise we show the UI.
 *
 * If it's a subdomain request we need to install the service worker, then
 * reload the current page so the request can be handled by the service worker.
 */
async function main (): Promise<void> {
  if (!isBrowserSupported()) {
    // browser is missing Web APIs we need, render the UI which will tell the
    // user their browser is unsupported
    await renderUi()
    return
  }

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

  let request: ResolvableURI

  try {
    request = parseRequest(url, new URL(globalThis.location.href))
  } catch (err: any) {
    // error during initialization, show an error message
    globalThis.serverError = {
      url: document.location.href,
      title: 'Bad request',
      description: 'An error occurred while trying to parse the URL.',
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
    return
  }

  try {
    if (request.type === 'path' || request.type === 'native') {
      // redirect to subdomain
      window.location.href = request.subdomainURL.href
      showUIAfterDelay(request)
      return
    }

    if (request.type === 'internal') {
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
      if ((url.pathname.startsWith('/ipfs') || url.pathname.startsWith('/ipns')) && url.searchParams.has(QUERY_PARAMS.URI_ROUTER)) {
        try {
          const uri = new URL(url.searchParams.get(QUERY_PARAMS.URI_ROUTER) ?? '')
          const request = parseRequest(uri, new URL(globalThis.location.href))

          if (request.type === 'subdomain' || request.type === 'path' || request.type === 'native') {
            window.location.href = request.subdomainURL.href
            showUIAfterDelay(request)
            return
          }
          return
        } catch (err: any) {
          // error during initialization, show an error message
          globalThis.serverError = {
            url: document.location.href,
            title: 'Invalid URI',
            description: 'Could not parse a valid URI from the passed argument',
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
      }
    } else {
      // we are on a subdomain, ensure the service worker is installed
      const registration = await navigator.serviceWorker.getRegistration()
      const hasActiveWorker = registration?.active != null

      if (!hasActiveWorker) {
        // install the service worker on the root path of this domain, either
        // path or subdomain gateway
        await registerServiceWorker()
      }

      // Clear SW-UI hashes before navigating: otherwise the post-reload
      // React app would match a `/ipfs-sw-…` route from the HashRouter
      // and show a SW UI page instead of the requested CID content,
      // causing endless redirects between the two.
      if (window.location.hash.startsWith('#/ipfs-sw')) {
        url.hash = ''
        window.location.hash = ''
      }

      // Trigger a navigation so the just-installed service worker can
      // intercept the subdomain request. Pick the cheapest primitive
      // that still works in the presence of a URL fragment.
      //
      // Same-URL navigation behavior (HTML spec, verified in Chromium
      // and Firefox):
      //
      //   Method                          No fragment   With fragment
      //   ------------------------------- ------------- -------------
      //   location.href = sameURL         reloads       no-op
      //   location.replace(sameURL)       reloads       no-op
      //   location.reload()               reloads       reloads
      //
      // For URLs that differ only in fragment (or match byte-for-byte
      // with a fragment), the spec treats the navigation as a
      // same-document fragment update, which collapses to a no-op when
      // the URLs are byte-equal. Only `reload()` bypasses that and
      // actually navigates. Without it the bootstrap would silently sit
      // on URLs like `…/file.pdf#page=6` because the SW would never
      // get a chance to intercept.
      //
      // Cache cost is the reason we do not unconditionally use
      // `reload()`: per spec, `location.reload()` sends
      // `Cache-Control: max-age=0` and forces a revalidation request
      // even when the browser has a fresh local copy. Behind a CDN
      // that meters requests (Cloudflare in production), every
      // SW-bypassed reload turns into a billable edge request. The
      // `href = url.toString()` path lets the browser serve the
      // bootstrap HTML from its own cache when possible, costing zero
      // edge requests.
      //
      // Caveat: `reload()` reloads the *current* URL, not `url`. If a
      // future change here mutates `url` after this point, switch the
      // fragment branch back to `location.href = url.toString()` and
      // strip the fragment before the assignment so the navigation
      // actually fires.
      if (url.hash === '') {
        window.location.href = url.toString()
      } else {
        window.location.reload()
      }

      showUIAfterDelay(request)
      return
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
    const script = document.createElement('script')
    script.type = 'module'
    script.src = '<%-- src/ui/index.tsx --%>'
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

/**
 * If the requested URL triggers a download, the currently displayed page will
 * not change so show the user something, otherwise it looks like they are stuck
 * on a loading page
 */
function showUIAfterDelay (request: ResolvableURI): void {
  setTimeout(() => {
    let cid: string | undefined

    if (request.type === 'native' && request.protocol === 'ipfs') {
      cid = request.nativeURL.hostname
    } else if (request.type === 'path' && request.protocol === 'ipfs') {
      cid = request.pathURL.pathname.split('/')[2]
    } else if (request.type === 'subdomain' && request.protocol === 'ipfs') {
      cid = request.subdomainURL.hostname.split('.ipfs.')[0]
    }

    globalThis.downloadingPage = {
      request,
      cid
    }

    renderUi()
  }, 500)
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('helia:sw-gateway:index: error rendering ui', err)
  })
