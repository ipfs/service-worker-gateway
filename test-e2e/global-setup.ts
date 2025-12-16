import { enable } from '@libp2p/logger'
import { serve } from '../serve.js'

export default async function globalSetup (): Promise<void> {
  enable('*,*:trace,-pw:*,-reverse-proxy*,-ipfs-gateway*')

  process.env.PLAYWRIGHT = 'true'

  const {
    controller
  } = await serve({
    shouldLoadFixtures: true,
    shouldStartFrontend: false
  })

  const info = await controller.info()

  process.env.KUBO_PID = `${info.pid}`
  process.env.KUBO_GATEWAY = info.gateway
  process.env.KUBO_RPC = info.api
}
