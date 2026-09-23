import { createNode } from 'ipfsd-ctl'
import { path as kuboPath } from 'kubo'
import { create } from 'kubo-rpc-client'
import type { KuboNode } from 'ipfsd-ctl'

const KUBO_GATEWAY_PORT = 8088

/**
 * Creates the main test Kubo node.
 *
 * The swarm is started so that inbound WebSocket and WebTransport connections
 * are accepted — these are exercised by the bitswap e2e tests.
 * Network isolation is maintained via:
 * - Bootstrap: []              — no bootstrap peers to connect to on startup
 * - Routing.Type: 'dht'        — DHT support for IPNS
 * - MDNS disabled              — no local peer discovery
 * - Gateway.NoFetch: true      — gateway never fetches missing blocks from peers
 *
 * We use 'dht' (rather than 'none') because IPNS tests publish records via
 * the node's key and then resolve them through the gateway; with Routing.Type
 * 'none' Kubo refuses to start the IPNS subsystem and resolution always fails.
 */
export async function createKuboNode (gatewayPort = KUBO_GATEWAY_PORT, nsMap: string): Promise<KuboNode> {
  return createNode({
    type: 'kubo',
    bin: kuboPath(),
    rpc: create,
    test: true,
    disposable: true,
    env: {
      IPFS_NS_MAP: nsMap
    },
    init: {
      config: {
        Addresses: {
          Gateway: `/ip4/127.0.0.1/tcp/${gatewayPort}`,
          API: '/ip4/127.0.0.1/tcp/0',
          Swarm: [
            '/ip4/127.0.0.1/tcp/0',
            '/ip4/127.0.0.1/tcp/0/ws',
            '/ip4/127.0.0.1/udp/0/quic-v1/webtransport'
          ]
        },
        Bootstrap: [],
        Routing: {
          Type: 'dht'
        },
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
