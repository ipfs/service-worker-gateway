import type { Libp2pOptions } from 'libp2p'
import { bootstrap } from '@libp2p/bootstrap'
import { kadDHT } from '@libp2p/kad-dht'

// const validTransports = ['/ws', '/wss', '/webtransport']

export const getDhtLibp2pConfig = (): Libp2pOptions => ({
  dht: kadDHT({
    clientMode: true
  }),
  /**
     * @see https://github.com/libp2p/js-libp2p/blob/master/doc/CONFIGURATION.md#configuring-connection-manager
     */
  connectionManager: {
    maxConnections: Infinity,
    minConnections: 1,
    pollInterval: 2000
    // autoDial: true
    // addressSorter: (addressA, addressB) => {
    //   // Sort addresses by valid browser protocols first
    //   const addressAString = addressA.multiaddr.toString()
    //   const addressBString = addressB.multiaddr.toString()
    //   const addressAIsValidBrowserProtocol = validTransports.some((transport) => addressAString.includes(transport))
    //   const addressBIsValidBrowserProtocol = validTransports.some((transport) => addressBString.includes(transport))
    //   if (addressAIsValidBrowserProtocol && !addressBIsValidBrowserProtocol) {
    //     return -1
    //   }
    //   if (!addressAIsValidBrowserProtocol && addressBIsValidBrowserProtocol) {
    //     return 1
    //   }
    //   return 0
    // }
  },
  /**
     * @see https://github.com/libp2p/js-libp2p/blob/master/doc/CONFIGURATION.md#configuring-peerstore
     */
  peerRouting: { // Peer routing configuration
    refreshManager: { // Refresh known and connected closest peers
      enabled: true, // Should find the closest peers.
      interval: 6e5, // Interval for getting the new for closest peers of 10min
      bootDelay: 10e3 // Delay for the initial query for closest peers
    }
  },

  /**
     * @see https://github.com/libp2p/js-libp2p/blob/master/doc/CONFIGURATION.md#customizing-peer-discovery
     */
  peerDiscovery: /** @type {import('libp2p').Libp2pOptions['peerDiscovery']} */([
    bootstrap({
      list: [
        '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
        '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
        '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
        '/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt',
        '/dns4/elastic.dag.house/tcp/443/wss/p2p/bafzbeibhqavlasjc7dvbiopygwncnrtvjd2xmryk5laib7zyjor6kf3avm'
      ]
    })
  ])
})
