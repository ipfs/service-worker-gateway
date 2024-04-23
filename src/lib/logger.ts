import { prefixLogger } from '@libp2p/logger'

const host = globalThis.location.host.replace(':', '_')
export const swLogger = prefixLogger(`helia:service-worker-gateway:sw:${host}`)

export const uiLogger = prefixLogger(`helia:service-worker-gateway:ui:${host}`)
