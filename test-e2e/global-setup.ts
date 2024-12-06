import { type Config } from '@playwright/test'
import { createKuboNode } from './fixtures/create-kubo-node.js'
import { loadKuboFixtures } from './fixtures/load-kubo-fixtures.js'

export default async function globalSetup (config: Config): Promise<void> {
  await loadKuboFixtures()
  const controller = await createKuboNode()
  await controller.start()

  const info = await controller.info()

  process.env.KUBO_PID = `${info.pid}`
  process.env.KUBO_GATEWAY = info.gateway
}
