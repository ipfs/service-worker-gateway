import { type Config } from '@playwright/test'
import { serve } from '../serve.js'

export default async function globalSetup (config: Config): Promise<void> {
  process.env.PLAYWRIGHT = 'true'

  const { controller } = await serve({ shouldLoadFixtures: true, shouldStartFrontend: false })

  const info = await controller.info()

  process.env.KUBO_PID = `${info.pid}`
  process.env.KUBO_GATEWAY = info.gateway
}
