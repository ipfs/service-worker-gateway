import { assetRequestHandler } from './asset-request-handler.ts'
import { configReloadHandler } from './config-reload-handler.ts'
import { configUpdateHandler } from './config-update-handler.ts'
import { contentRequestHandler } from './content-request-handler.ts'
import { unregisterHandler } from './unregister-handler.ts'
import { uriRouterHandler } from './uri-router-handler.ts'

export interface Handler {
  name: string

  canHandle(url: URL, event: FetchEvent, logs: string[]): boolean

  handle(url: URL, event: FetchEvent, logs: string[]): Response | Promise<Response>
}

/**
 * Fetch event handlers - these are queried as defined so their order is
 * important
 */
export const handlers: Handler[] = [
  unregisterHandler,
  uriRouterHandler,
  configUpdateHandler,
  configReloadHandler,
  assetRequestHandler,
  contentRequestHandler
]
