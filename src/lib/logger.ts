import { logger } from '@libp2p/logger'
import debug from 'debug'

debug.enable('helia:*,helia*:trace')
const logObj = logger('helia:service-worker-gateway')

export const log = logObj
export const error = logObj.error
export const trace = logObj.trace
