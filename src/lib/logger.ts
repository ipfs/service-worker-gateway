import { prefixLogger, type ComponentLogger } from '@libp2p/logger'

const host = globalThis.location.host.replace(':', '_')

const swLogPrefix = `helia:service-worker-gateway:sw:${host}`
const uiLogPrefix = `helia:service-worker-gateway:ui:${host}`

export const swLogger = prefixLogger(swLogPrefix)
export const uiLogger = prefixLogger(uiLogPrefix)

export const getUiComponentLogger = (component: string): ComponentLogger => {
  return prefixLogger(`${uiLogPrefix}:${component}`)
}
