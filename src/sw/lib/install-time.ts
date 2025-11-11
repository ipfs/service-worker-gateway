import { getSwLogger } from '../../lib/logger'
import { getSwConfig } from './sw-config'

let firstInstallTime: number

export async function setInstallTime (): Promise<void> {
  const log = getSwLogger('set-install-time')

  try {
    const timestamp = Date.now()
    firstInstallTime = timestamp
    const swidb = getSwConfig()
    await swidb.open()
    await swidb.put('installTimestamp', timestamp)
    swidb.close()
  } catch (err) {
    log.error('addInstallTimestampToConfig error - %e', err)
  }
}

export async function getInstallTime (): Promise<number> {
  const log = getSwLogger('get-install-time')

  try {
    const swidb = getSwConfig()
    await swidb.open()
    firstInstallTime = await swidb.get('installTimestamp')
    swidb.close()
    return firstInstallTime
  } catch (err) {
    log.error('getInstallTimestamp error = %e', err)
    return 0
  }
}
