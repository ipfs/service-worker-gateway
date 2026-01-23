import { prefixLogger } from '@libp2p/logger'
import { collectingLogger } from './collecting-logger.ts'
import type { ComponentLogger, Logger } from '@libp2p/interface'

export const uiLogger = prefixLogger('ui')

export const getUiComponentLogger = (component: string): Logger => {
  return uiLogger.forComponent(component)
}

// globally scoped values can be lost when the sw is unloaded
let swLogger: ComponentLogger

export function getSwLogger (): ComponentLogger
export function getSwLogger (component: string): Logger
export function getSwLogger (component?: string): Logger | ComponentLogger {
  if (swLogger == null) {
    swLogger = collectingLogger('service-worker')
  }

  if (component == null) {
    return swLogger
  }

  return swLogger.forComponent(component)
}
