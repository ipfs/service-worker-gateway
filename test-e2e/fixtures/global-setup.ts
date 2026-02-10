import polka from 'polka'
import { startServers } from './serve/index.ts'

export default async function globalSetup (config: Record<string, any> = {}): Promise<void> {
  const servers = await startServers({
    loadFixtures: true,
    startFrontend: process.env.SHOULD_SERVE !== 'false'
  })

  const kuboInfo = await servers.kubo.info()
  process.env.KUBO_PID = `${kuboInfo.pid}`
  process.env.KUBO_GATEWAY = kuboInfo.gateway
  process.env.KUBO_RPC = kuboInfo.api

  process.env.PLAYWRIGHT = 'true'

  process.env.DNS_JSON_SERVER = `http://127.0.0.1:${getPort(servers.dnsJsonServer)}/dns-query`
  process.env.TEST_API_SERVER = `http://127.0.0.1:${getPort(servers.dnsJsonServer)}`

  config.userData = servers
}

function getPort (server: polka.Polka): number {
  const address = server.server?.address()

  if (address == null || typeof address === 'string') {
    throw new Error('Server was not listening')
  }

  return address.port
}
