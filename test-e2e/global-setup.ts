import { type Config } from '@playwright/test'
import { createKuboNode } from './fixtures/create-kubo-node.js'
import { loadKuboFixtures } from './fixtures/load-kubo-fixtures.js'

export default async function globalSetup (config: Config): Promise<void> {
  await loadKuboFixtures()
  const controller = await createKuboNode()
  await controller.start()

  process.env.KUBO_PID = `${await controller.pid()}`
  const gateway = `http://${controller.api.gatewayHost}:${controller.api.gatewayPort}`
  process.env.KUBO_GATEWAY = gateway
}
