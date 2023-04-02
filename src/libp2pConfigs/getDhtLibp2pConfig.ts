import type { Libp2pOptions } from 'libp2p'
import { bootstrap } from '@libp2p/bootstrap'
import { kadDHT } from '@libp2p/kad-dht'
// import { publicAddressesFirst } from '@libp2p/utils/address-sort'
// import { P2P } from '@multiformats/mafmt'
// const validTransports = ['/ws', '/wss', '/webtransport']

export const getDhtLibp2pConfig = (): Libp2pOptions => ({
  dht: kadDHT({
    clientMode: true
    // querySelfInterval: 15000,
    // pingConcurrency: 2
    // randomWalk: {
    //   enabled: true, // Allows to disable discovery (enabled by default)
    //   interval: 300e3,
    //   timeout: 10e3
    // }
  }),
  // connectionGater: {
  //   denyDialMultiaddr: (peerId, multiaddr) => {
  //     return P2P.matches(multiaddr.toString())
  //   }

  // },
  // connectionProtector: {

  // },
  /**
     * @see https://github.com/libp2p/js-libp2p/blob/master/doc/CONFIGURATION.md#configuring-connection-manager
     */
  connectionManager: {
    maxConnections: Infinity,
    minConnections: 1,
    pollInterval: 2000,
    autoDialInterval: 10000
    // // @ts-expect-error - dev types added to node_modules
    // maxGlobalDialsPerInterval: 2,
    // maxGlobalConcurrentDials: 6
    // maxAddrsToDial: 50,
    // autoDial: true,
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
    //   return publicAddressesFirst(addressA, addressB)
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
      // bootDelay: 2000 // Delay for the initial query for closest peers
    }
  },
  // peerStore: {
  //   addressFilter: (peerId, multiaddr) => {
  //     // console.log('multiaddr: ', multiaddr)
  //     // return multiaddrs.filter((multiaddr) => {
  //     const multiaddrString = multiaddr.toString()
  //     // const isSupportedMultiaddr = validTransports.some((transport) => multiaddrString.includes(transport))
  //     // // console.log(`${multiaddrString} is ${isSupportedMultiaddr ? 'supported' : 'not supported'}`)
  //     // console.log(`${multiaddrString} is ${P2P.matches(multiaddrString) ? 'supported' : 'not supported'}`)
  //     return P2P.matches(multiaddrString)
  //     // })
  //   }
  // },

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
