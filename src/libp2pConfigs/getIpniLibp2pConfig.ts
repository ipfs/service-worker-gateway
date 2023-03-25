import type { Libp2pOptions } from 'libp2p'
import { delegatedPeerRouting } from '@libp2p/delegated-peer-routing'
import { ipniRouting } from '../ipni-routing.ts'
import { create as kuboClient } from 'kubo-rpc-client'

export const getIpniLibp2pConfig = (): Libp2pOptions => {
  const delegatedClient = kuboClient({
    // use default api settings
    protocol: 'https',
    port: 443,
    host: 'node3.delegate.ipfs.io'
  })

  return {
    peerRouters: [delegatedPeerRouting(delegatedClient)],
    // contentRouters: [ipniRouting('https', 'indexstar.prod.cid.contact', '443'), delegatedContentRouting(delegatedClient)],
    contentRouters: [ipniRouting('https', 'cid.contact', '443')],
    /**
     * @see https://github.com/libp2p/js-libp2p/blob/master/doc/CONFIGURATION.md#configuring-connection-manager
     */
    connectionManager: {
      // Auto connect to discovered peers (limited by ConnectionManager minConnections)
      maxConnections: Infinity,
      minConnections: 1,
      pollInterval: 2000
    },
    /**
     * @see https://github.com/libp2p/js-libp2p/blob/master/doc/CONFIGURATION.md#configuring-peerstore
     */
    peerRouting: { // Peer routing configuration
      refreshManager: { // Refresh known and connected closest peers
        enabled: false, // Should find the closest peers.
        interval: 6e5, // Interval for getting the new for closest peers of 10min
        bootDelay: 10e3 // Delay for the initial query for closest peers
      }
    }
  }
}
