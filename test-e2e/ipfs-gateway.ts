/* eslint-disable no-console */
/**
 * This file is used to simulate hosting the dist folder on an ipfs gateway, so we can handle _redirects
 */
import { logger } from '@libp2p/logger'
import waitOn from 'wait-on'
import { createKuboNode, gatewayPort, getKuboDistCid } from './fixtures/create-kubo-node.js'
import { createReverseProxy } from './reverse-proxy.js'
import type { KuboNode } from 'ipfsd-ctl'

// to get logs for kubo node, you need to use 'ipfsd-ctl:kubo'
const proxyLog = logger('ipfs-gateway:proxy')
const log = logger('ipfs-gateway')

export interface KuboNodeInstance {
  stop(): Promise<void>
}

async function isKuboRunning (): Promise<boolean> {
  if (process.env.KUBO_RUNNING === 'true' || process.env.PLAYWRIGHT === 'true') {
    return true
  }
  try {
    await waitOn({
      resources: [`tcp:${gatewayPort}`],
      interval: 100,
      timeout: 500
    })
    return true
  } catch (error) {
    return false
  }
}

export async function setupIpfsGateway (): Promise<KuboNodeInstance> {
  // if we are running via playwright, we need to wait for the gateway to be open, otherwise we need to start the kubo node via createKuboNode
  let controller: KuboNode | undefined
  if (!await isKuboRunning()) {
    log('Starting kubo node')
    controller = await createKuboNode()
    await controller.start()
  }

  const cid = await getKuboDistCid()

  // Create and start the reverse proxy
  const proxyPort = Number(process.env.PROXY_PORT ?? '3334')

  const reverseProxy = createReverseProxy({
    targetHost: 'localhost',
    backendPort: gatewayPort,
    proxyPort,
    subdomain: `${cid.trim()}.ipfs`,
    disableTryFiles: true,
    xForwardedHost: 'ipfs-host.local',
    log: proxyLog
  })

  return {
    stop: async () => {
      await new Promise(resolve => reverseProxy.close(resolve))
      await controller?.stop()
    }
  }
}
