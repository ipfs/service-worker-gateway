import { TypedEventEmitter } from '@libp2p/interface'
import { logger } from '@libp2p/logger'
import { format } from 'weald/format'
import type { ComponentLogger, TypedEventTarget } from '@libp2p/interface'

export interface LogEvents {
  log: CustomEvent<string>
}

/**
 * Listen for 'log' events to collect logs for operations
 */
export let logEmitter: TypedEventTarget<LogEvents> = new TypedEventEmitter<LogEvents>()

/**
 * A log implementation that also emits all log lines as 'log' events on the
 * exported `logEmitter`.
 */
export function collectingLogger (prefix?: string): ComponentLogger {
  return {
    forComponent (name: string) {
      return logger(`${prefix == null ? '' : `${prefix}:`}${name}`, {
        onLog (fmt: string, ...args: any[]): void {
          if (logEmitter == null) {
            logEmitter = new TypedEventEmitter<LogEvents>()
          }

          logEmitter.safeDispatchEvent('log', {
            detail: format(fmt.replaceAll('%c', ''), ...args.filter(arg => !`${arg}`.startsWith('color:')))
          })
        }
      })
    }
  }
}
