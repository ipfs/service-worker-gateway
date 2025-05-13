import { enable } from '@libp2p/logger'
import { type Config } from '@playwright/test'
import { serve } from '../serve.js'
import { gatewayPort } from './fixtures/create-kubo-node.js'
import { kuboRepoDir } from './fixtures/load-kubo-fixtures.js'

export default async function globalSetup (config: Config): Promise<void> {
  enable('kubo-init*,kubo-init*:trace,ipfs-host.local*,ipfs-host.local*:trace,serve*,serve*:trace')

  process.env.PLAYWRIGHT = 'true'
  process.env.IPFS_PATH = kuboRepoDir

  const { controller } = await serve({ shouldLoadFixtures: gatewayPort === 8088, shouldStartFrontend: false })

  if (controller != null) {
    const info = await controller.info()

    process.env.KUBO_PID = `${info.pid}`
    process.env.KUBO_GATEWAY = info.gateway
  } else {
    // eslint-disable-next-line no-console
    console.log('not controlling the kubo node...')
  }
}
