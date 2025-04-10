import { type Config } from '@playwright/test'
import { createKuboNode } from './fixtures/create-kubo-node.js'
import { loadKuboFixtures } from './fixtures/load-kubo-fixtures.js'
import { setupIpfsGateway } from './ipfs-gateway.js'
import { createReverseProxy } from './reverse-proxy.js'

export default async function globalSetup (config: Config): Promise<void> {
  process.env.PLAYWRIGHT = 'true'
  await loadKuboFixtures()

  const controller = await createKuboNode()
  await controller.start()

  const info = await controller.info()

  process.env.KUBO_PID = `${info.pid}`
  process.env.KUBO_GATEWAY = info.gateway

  await setupIpfsGateway()

  createReverseProxy({
    backendPort: 3000, // from playwright webserver
    proxyPort: 3333
  })
}
