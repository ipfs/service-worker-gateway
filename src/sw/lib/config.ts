import { Config } from '../../lib/config-db.js'
import { getSwLogger } from '../../lib/logger.js'
import type { ConfigDb } from '../../lib/config-db.js'

let config: ConfigDb

export const updateConfig = async (url?: URL, referrer?: string | null): Promise<void> => {
  const conf = new Config({
    logger: getSwLogger()
  }, {
    url
  })
  await conf.init(referrer ?? undefined)
  config = await conf.get()
}

export async function getConfig (): Promise<ConfigDb> {
  // globals are lost when the sw is stopped
  if (config == null) {
    await updateConfig()
  }

  return config
}
