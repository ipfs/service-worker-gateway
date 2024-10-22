import { type ComponentLogger, type Logger } from '@libp2p/logger'
import debug from 'debug'

/**
 * Hack to get around @libp2p/logger not working inside a service worker.
 */
const createlibp2pLogger = (prefix: string): Logger => {
  const mainLogger = debug(prefix)
  return Object.assign(debug(prefix), {
    error: mainLogger.extend('error'),
    // warn: mainLogger.extend('warn'),
    // info: mainLogger.extend('info'),
    // debug: mainLogger.extend('debug'),
    trace: mainLogger.extend('trace')
  })
}
export function prefixLogger (prefix: string): ComponentLogger {
  return {
    forComponent (name: string) {
      return createlibp2pLogger(`${prefix}:${name}`)
    }
  }
}
const host = globalThis.location.host.replace(':', '_')

const swLogPrefix = `helia:sw-gateway:sw:${host}`
const uiLogPrefix = `helia:sw-gateway:ui:${host}`

export const swLogger = prefixLogger(swLogPrefix)
export const uiLogger = prefixLogger(uiLogPrefix)

export const getUiComponentLogger = (component: string): ComponentLogger => {
  return prefixLogger(`${uiLogPrefix}:${component}`)
}
