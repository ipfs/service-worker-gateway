import { isUnregisterRequest } from '../../lib/unregister-request.js'
import type { Handler } from './index.js'

declare let self: ServiceWorkerGlobalScope

export const unregisterHandler: Handler = {
  name: 'unregister-service-worker-handler',

  canHandle (url, event) {
    return isUnregisterRequest(event.request.url)
  },

  handle (url: URL, event: FetchEvent) {
    event.waitUntil(self.registration.unregister())

    return new Response('Service worker unregistered', {
      status: 200
    })
  }
}
