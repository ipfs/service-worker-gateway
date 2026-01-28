import { assetRequestHandler } from './asset-request-handler.ts'
import { contentRequestHandler } from './content-request-handler.ts'
import { unregisterHandler } from './unregister-handler.ts'
import { uriRouterHandler } from './uri-router-handler.ts'
import type { ResolvableURI } from '../../lib/parse-request.ts'

export interface Handler {
  name: string

  canHandle(request: ResolvableURI, event: FetchEvent, logs: string[]): boolean

  handle(request: ResolvableURI, event: FetchEvent, logs: string[]): Response | Promise<Response>
}

/**
 * Fetch event handlers - these are queried as defined so their order is
 * important
 */
export const handlers: Handler[] = [
  unregisterHandler,
  uriRouterHandler,
  assetRequestHandler,
  contentRequestHandler
]
