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
    renderUi()
    return
  }

  if (!('serviceWorker' in navigator)) {
    // no service worker support, render the UI which will tell the user
    // service workers are not supported
    renderUi()
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
    renderUi()
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

    renderUi()
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

    renderUi()
    return
  }

  try {
    if (request.type === 'path' || request.type === 'native') {
      await showDownloadingPageAfterDelay(request)

      // redirect to subdomain
      window.location.href = request.subdomainURL.href
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
            await showDownloadingPageAfterDelay(request)
            window.location.href = request.subdomainURL.href
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

      // Clear SW-UI hash nav or assets before navigating: otherwise the
      // post-reload React app would match a `/ipfs-sw-…` route from the
      // HashRouter and show a SW UI page instead of the requested CID content,
      // causing endless redirects between the two.
      if (window.location.hash.startsWith('#/ipfs-sw') || window.location.pathname.startsWith('/ipfs-sw')) {
        url.hash = ''
        window.location.hash = ''
        url.pathname = ''
      }

      await showDownloadingPageAfterDelay(request)

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

  renderUi()
}

/**
 * Marks, on the current history entry, that we have already tried to recover
 * from an app chunk that would not load.
 *
 * `history.state` is the right place for it. It survives `location.reload()`,
 * it is scoped to this page rather than the whole origin, and reading it needs
 * no storage permission, so the cap still holds in a browser configured to
 * block storage. `tooManyRedirects` cannot be reused here for a different
 * reason: it ignores everything unless `document.referrer` is the current URL,
 * which a `location.reload()` never makes true.
 */
const CHUNK_RETRIED = 'ipfsSwChunkRetried'

function alreadyRetriedChunk (): boolean {
  return history.state?.[CHUNK_RETRIED] === true
}

function markChunkRetried (): void {
  history.replaceState({ ...history.state, [CHUNK_RETRIED]: true }, '')
}

function forgetChunkRetry (): void {
  if (!alreadyRetriedChunk()) {
    return
  }

  const state = { ...history.state }
  delete state[CHUNK_RETRIED]
  history.replaceState(state, '')
}

/**
 * Tell the user the app chunk will not load, using only the bootstrap DOM.
 *
 * Everything `renderUi` would normally reach for lives inside the chunk that
 * just failed: every page, the error pages among them, and the
 * `globalThis.serverError` channel that renders them. What is left is the
 * markup `index.html` already parsed, so build the message out of that.
 */
function showAppChunkError (): void {
  document.querySelector('.loading-indicator-js')?.classList.add('hidden')

  const root = document.getElementById('root')

  if (root == null) {
    return
  }

  // `.sw-error` is defined in the inline stylesheet of index.html, because the
  // stylesheet the app ships is inside the chunk that failed to load.
  root.classList.add('sw-error')

  const title = document.createElement('h1')
  title.textContent = 'Could not load this page'

  const cause = document.createElement('p')
  cause.textContent = 'The application script failed to load. Usually a CDN or your browser is holding a stale copy of this page that points at a script which no longer exists.'

  const remedy = document.createElement('p')
  remedy.textContent = 'Waiting a few minutes and trying again normally clears it. A hard reload, which bypasses your browser cache, fetches a fresh copy right away.'

  const retry = document.createElement('button')
  retry.textContent = 'Try again'
  retry.addEventListener('click', () => {
    forgetChunkRetry()
    // @ts-expect-error boolean `forceGet` argument is firefox-only
    document.location.reload(true)
  })

  root.replaceChildren(title, cause, remedy, retry)
}

/**
 * Asynchronously loads and shows the UI - this is to make the number of bytes
 * downloaded before the service worker is installed smaller
 */
function renderUi (): void {
  // dynamically load the app chunk using the correct filename
  try {
    const script = document.createElement('script')
    script.addEventListener('load', () => {
      forgetChunkRetry()
    })
    script.addEventListener('error', () => {
      // Safari errors when loading a script during page navigation so swallow
      // the error if it fails
      if (isWebkit()) {
        return
      }

      // Recover once, and only once. Dropping the caches and the service worker
      // is what fixes a bootstrap left behind by a deploy, and the reload is
      // what picks up the current one. If the chunk is still missing after
      // that, the stale copy lives in a CDN entry that no reload can evict, so
      // trying again only hammers the CDN until it rate limits us, with the
      // user watching a blank page throughout. That is the cyclic reload
      // reported in #1155.
      if (alreadyRetriedChunk()) {
        showAppChunkError()
        return
      }

      // Mark before the purge below, which deletes every cache, and before the
      // reload, which resets the page.
      markChunkRetried()

      // failed to load script, there may be a new service worker available -
      // delete all caches, unregister the service worker and reload
      Promise.all([
        caches.keys()
          .then(async (cacheNames) => {
            return Promise.all(
              cacheNames.map(async function (cacheName) {
                return caches.delete(cacheName)
              })
            )
          })
          .catch(err => {
            // eslint-disable-next-line no-console
            console.error('could not delete out of date cache - %e', err)
          }),
        navigator.serviceWorker.getRegistration()
          .then(async registration => {
            registration?.unregister()
          })
      ])
        .then(() => {
          // @ts-expect-error boolean `forceGet` argument is firefox-only
          document.location.reload(true)
        })
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.error('could not refresh context', err)
        })
    })
    script.type = 'module'
    script.src = '<%-- src/ui/index.tsx --%>'
    document.body.appendChild(script)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('failed to load app ui', err)
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
 * on a loading page.
 *
 * If the user is on a WebKit-based browser loading the UI js file while a
 * navigation is occurring will fail so wait for the UI to appear before
 * redirecting, otherwise load the UI asynchronously.
 */
async function showDownloadingPageAfterDelay (request: ResolvableURI, delay = 500): Promise<void> {
  if (isWebkit()) {
    showDownloadingPage(request)
    await waitForUiToRender()

    return
  }

  setTimeout(() => {
    showDownloadingPage(request)
  }, delay)
}

/**
 * If the requested URL triggers a download, the currently displayed page will
 * not change so show the user something, otherwise it looks like they are stuck
 * on a loading page
 */
function showDownloadingPage (request: ResolvableURI): void {
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
}

/**
 * Detect WebKit browsers
 */
function isWebkit (): boolean {
  return 'GestureEvent' in globalThis
}

/**
 * Wait for the UI to be present in the DOM
 */
async function waitForUiToRender (): Promise<void> {
  let interval: ReturnType<typeof setInterval>

  await new Promise<void>((resolve) => {
    interval = setInterval(() => {
      if (document.getElementsByTagName('header').length === 0) {
        return
      }

      clearInterval(interval)
      resolve()
    }, 100)
  })
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('helia:sw-gateway:index: error rendering ui', err)
  })
