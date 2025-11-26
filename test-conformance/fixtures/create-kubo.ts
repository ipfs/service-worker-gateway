import { createNode } from 'ipfsd-ctl'
import { path as kuboPath } from 'kubo'
import { create } from 'kubo-rpc-client'
import type { KuboNode } from 'ipfsd-ctl'

export interface KuboNodeDetails {
  node: KuboNode
  gatewayUrl: string
  repoPath: string
}

export async function createKuboNode (listenPort?: number): Promise<KuboNodeDetails> {
  const controller = await createNode({
    type: 'kubo',
    rpc: create,
    test: true,
    bin: kuboPath(),
    init: {
      config: {
        Addresses: {
          Swarm: [
            '/ip4/0.0.0.0/tcp/0',
            '/ip4/0.0.0.0/tcp/0/ws'
          ],
          Gateway: `/ip4/127.0.0.1/tcp/${listenPort ?? 0}`
        },
        Gateway: {
          NoFetch: true,
          ExposeRoutingAPI: true,
          HTTPHeaders: {
            'Access-Control-Allow-Origin': ['*'],
            'Access-Control-Allow-Methods': ['GET', 'POST', 'PUT', 'OPTIONS']
          }
        }
      }
    },
    args: ['--enable-pubsub-experiment', '--enable-namesys-pubsub']
  })
  const info = await controller.info()

  return {
    node: controller,
    gatewayUrl: `http://127.0.0.1:${listenPort ?? 0}`,
    repoPath: info.repo
  }
}
