import polka from 'polka'
import { downloadFixtures, getIpfsNsMap, loadCarFixtures, loadIpnsRecords } from '../load-kubo-fixtures.ts'
import { createDNSJSONServer } from './dns-json-server.ts'
import { createKuboNode } from './kubo.ts'
import { createHttpServer } from './service-worker.ts'
import type { KuboNode } from 'ipfsd-ctl'
import type { Server } from 'node:http'

export interface StartServersOptions {
  kuboGatewayPort?: number
  loadFixtures?: boolean
  dnsJsonServerPort?: number
  serviceWorkerPort?: number
  startFrontend?: boolean

  /**
   * If true, start a secondary gateway unconnected to the first
   */
  startSecondaryGateway?: boolean
}

export interface Servers {
  kubo: KuboNode
  gateway?: KuboNode
  dnsJsonServer: polka.Polka
  serviceWorker?: Server

  stop(): Promise<void>
}

/**
 * Starts:
 *
 * 1. A DNS-JSON server to put/get TXT records to enable dnslink
 * 2. A Kubo node to supply blocks
 * 4. A web server to serve the service worker files
 */
export async function startServers (options: StartServersOptions = {}): Promise<Servers> {
  let nsMap = ''

  if (options.loadFixtures === true) {
    await downloadFixtures()
    nsMap = await getIpfsNsMap()
  }

  const kubo = await createKuboNode(options.kuboGatewayPort, nsMap)

  if (options.loadFixtures === true) {
    await loadCarFixtures(kubo)
    await loadIpnsRecords(kubo)
  }

  const dnsJsonServer = await createDNSJSONServer(options.kuboGatewayPort)
  let serviceWorker: Server | undefined

  if (options.startFrontend !== false) {
    serviceWorker = await createHttpServer(options.serviceWorkerPort)
  }

  let gateway: KuboNode | undefined

  if (options.startSecondaryGateway !== false) {
    gateway = await createKuboNode(0, '')
  }

  const stop = async (): Promise<void> => {
    await kubo?.stop()
    await gateway?.stop()
    dnsJsonServer?.server?.close?.()
    dnsJsonServer?.server?.closeAllConnections?.()
    serviceWorker?.close?.()
    serviceWorker?.closeAllConnections?.()
  }

  return {
    kubo,
    gateway,
    dnsJsonServer,
    serviceWorker,
    stop
  }
}
