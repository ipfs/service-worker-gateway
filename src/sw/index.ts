import weald from 'weald'
import { config } from '../config/index.ts'
import { CURRENT_CACHES } from '../constants.ts'
import { logEmitter } from '../lib/collecting-logger.ts'
import { QUERY_PARAMS } from '../lib/constants.ts'
import { getSwLogger } from '../lib/logger.ts'
import { parseRequest } from '../lib/parse-request.ts'
import { APP_NAME, APP_VERSION, GIT_REVISION } from '../version.ts'
import { handlers } from './handlers/index.ts'
import { getInstallTime, setInstallTime } from './lib/install-time.ts'
import { updateRedirect } from './lib/update-redirect.ts'
import { serverErrorPageResponse } from './pages/server-error-page.ts'
import type { ResolvableURI } from '../lib/parse-request.ts'
import type { Handler } from './handlers/index.ts'

weald.enable(config.debug)

export interface Provider {
  type: string
  routing: string
  provider: any
}

/**
 * These are block/car providers that were used while downloading data
 */
export interface Providers {
  total: number
  // this is limited to 10x entries to prevent new routing systems causing OOMs
  providers: Provider[]
}

declare let self: ServiceWorkerGlobalScope

self.addEventListener('install', (event) => {
  const log = getSwLogger('install')

  // 👇 When a new version of the SW is installed, activate immediately
  self.skipWaiting()
    .catch(err => {
      log.error('error skipping waiting - %e', err)
    })
  event.waitUntil(setInstallTime())
  event.waitUntil(clearSwAssetCache())
})

self.addEventListener('activate', (event) => {
  const log = getSwLogger('activate')

  /**
   * 👇 Claim all clients immediately. This handles the case when subdomain is
   * loaded for the first time, and config is updated and then a pre-fetch is
   * sent (await fetch(window.location.href, { method: 'GET' })) to start
   * loading the content prior the user reloading or clicking the "load content"
   * button.
   */
  event.waitUntil(
    self.clients.claim()
      .catch(err => {
        const log = getSwLogger('fetch')
        log.error('error claiming clients - %e', err)
      })
  )

  // eslint-disable-next-line no-console
  console.info(`Service Worker Gateway: To manually unregister, append "?${QUERY_PARAMS.UNREGISTER_SERVICE_WORKER}=true" to the URL, or use the button on the config page.`)

  // delete all caches that aren't named in CURRENT_CACHES.
  const expectedCacheNames = Object.keys(CURRENT_CACHES).map(function (key) {
    return CURRENT_CACHES[key as keyof typeof CURRENT_CACHES]
  })

  event.waitUntil(
    caches.keys()
      .then(async function (cacheNames) {
        return Promise.all(
          cacheNames.map(async function (cacheName) {
            if (!expectedCacheNames.includes(cacheName as (typeof CURRENT_CACHES)[keyof typeof CURRENT_CACHES])) {
              // If this cache name isn't present in the array of "expected" cache names, then delete it.
              log('deleting out of date cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .catch(err => {
        log.error('could not delete out of date cache - %e', err)
      })
  )
})

self.addEventListener('fetch', (event) => {
  const log = getSwLogger('fetch')
  const url = new URL(event.request.url)
  const request = parseRequest(url, new URL(self.location.href))

  // collect logs from Helia/libp2p during the fetch operation
  const logs: string[] = []

  function onLog (event: CustomEvent<string>): void {
    logs.push(event.detail)
  }

  logEmitter.addEventListener('log', onLog)

  const handler = handlers.find(handler => handler.canHandle(request, event, logs))

  if (handler == null) {
    log('no handler found, falling back to global fetch for %s', url)
    return
  }

  log.trace('incoming request url %s - handler %s', event.request.url, handler.name)

  // `event.respondWith` must be called synchronously in the event handler, but
  // we can pass it a promise
  // https://stackoverflow.com/questions/76848928/failed-to-execute-respondwith-on-fetchevent-the-event-handler-is-already-f
  event.respondWith(
    handleFetch(request, event, handler, logs)
      .then(async response => {
        // maybe uninstall service worker after request has finished
        // TODO: remove this, it breaks offline installations after the TTL
        // has expired
        if (!(await isServiceWorkerRegistrationTTLValid())) {
          log('Service worker registration TTL expired, unregistering service worker')
          const clonedResponse = response.clone()
          event.waitUntil(
            clonedResponse.blob().then(() => {
              log('Service worker registration TTL expired, unregistering after response consumed')
            }).finally(() => self.registration.unregister())
          )
        }

        // if verified-fetch has redirected us, update the location header in
        // the response to be a HTTP location not ipfs/ipns
        updateRedirect(url, response)

        // add the server header to the response so we can be sure this response
        // came from the service worker - sometimes these are read-only so we
        // cannot just `response.headers.set('server', ...)`
        const headers = new Headers(response.headers)
        headers.set('server', `${APP_NAME}/${APP_VERSION}#${GIT_REVISION}`)

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers
        })
      })
      .catch(err => {
        return serverErrorPageResponse(url, err, logs)
      })
      .finally(() => {
        logEmitter.removeEventListener('log', onLog)
      })
  )
})

async function handleFetch (request: ResolvableURI, event: FetchEvent, handler: Handler, logs: string[]): Promise<Response> {
  try {
    return await handler.handle(request, event, logs)
  } catch (err) {
    // ensure we only reject, never throw
    return Promise.reject(err)
  }
}

async function isServiceWorkerRegistrationTTLValid (): Promise<boolean> {
  if (!navigator.onLine) {
    /**
     * When we unregister the service worker, the a new one will be installed on
     * the next page load.
     *
     * Note: returning true here means if the user is not online, we will not
     * unregister the service worker.
     *
     * However, browsers will have `navigator.onLine === true` if connected to a
     * LAN that is not internet-connected, so we may want to be smarter about
     * this in the future.
     *
     * @see https://github.com/ipfs/service-worker-gateway/issues/724
     */
    return true
  }

  const firstInstallTime = await getInstallTime()

  if (firstInstallTime == null) {
    // no firstInstallTime or serviceWorkerRegistrationTTL, assume new and valid
    return true
  }

  const now = Date.now()
  return now - firstInstallTime <= config.serviceWorkerTTL
}

/**
 * To be called on 'install' sw event. This will clear out the old swAssets cache,
 * which is used for storing the service worker's css,js, and html assets.
 */
async function clearSwAssetCache (): Promise<void> {
  const log = getSwLogger('clear-sw-asset-cache')

  // clear out old swAssets cache
  const cacheName = CURRENT_CACHES.swAssets
  const cache = await caches.open(cacheName)

  try {
    const keys = await cache.keys()
    for (const request of keys) {
      await cache.delete(request)
    }
  } catch (err) {
    log.error('could not clear SW asset cache - %e', err)
  }
}
