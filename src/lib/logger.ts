import { prefixLogger, type ComponentLogger } from '@libp2p/logger'

const host = globalThis.location?.host.replace(':', '_') ?? 'test.localhost'

const swLogPrefix = `helia:sw-gateway:sw:${host}`
const uiLogPrefix = `helia:sw-gateway:ui:${host}`

export const swLogger = prefixLogger(swLogPrefix)
export const uiLogger = prefixLogger(uiLogPrefix)

export const getUiComponentLogger = (component: string): ComponentLogger => {
  return prefixLogger(`${uiLogPrefix}:${component}`)
}
