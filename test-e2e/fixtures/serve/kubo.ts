import { createNode } from 'ipfsd-ctl'
import { path as kuboPath } from 'kubo'
import { create } from 'kubo-rpc-client'
import type { KuboNode } from 'ipfsd-ctl'

const KUBO_GATEWAY_PORT = 8088

export async function createKuboNode (gatewayPort = KUBO_GATEWAY_PORT, nsMap: string): Promise<KuboNode> {
  return createNode({
    type: 'kubo',
    bin: kuboPath(),
    rpc: create,
    test: true,
    disposable: true,
    start: {
      args: ['--offline']
    },
    env: {
      IPFS_NS_MAP: nsMap
    },
    init: {
      config: {
        Addresses: {
          Gateway: `/ip4/127.0.0.1/tcp/${gatewayPort}`,
          API: '/ip4/127.0.0.1/tcp/0'
        },
        Bootstrap: [],
        Swarm: {
          DisableNatPortMap: true
        },
        Discovery: {
          MDNS: {
            Enabled: false
          }
        },
        Gateway: {
          NoFetch: true,
          DeserializedResponses: true,
          ExposeRoutingAPI: true,
          HTTPHeaders: {
            'Access-Control-Allow-Origin': ['*'],
            'Access-Control-Allow-Methods': ['GET', 'POST', 'PUT', 'OPTIONS']
          }
        }
      }
    },
    args: []
  })
}
