import { HeliaInit, createHelia } from 'helia'
import type { Helia } from '@helia/interface'
import { createLibp2p } from 'libp2p'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { mplex} from '@libp2p/mplex'
import { webSockets } from '@libp2p/websockets'
import { webTransport } from '@libp2p/webtransport'
// import { bootstrap } from '@libp2p/bootstrap'
import { kadDHT } from '@libp2p/kad-dht'
import { MemoryBlockstore } from 'blockstore-core'
import { MemoryDatastore } from 'datastore-core'
import { delegatedPeerRouting } from "@libp2p/delegated-peer-routing";
import { delegatedContentRouting } from "@libp2p/delegated-content-routing";
import { create as kuboClient } from "kubo-rpc-client";
import { webRTCStar } from '@libp2p/webrtc-star'
import { getExistingPeerId, persistPeerId } from './lib'
import { bootstrap } from '@libp2p/bootstrap'


export async function getHelia (): Promise<Helia> {
  // the blockstore is where we store the blocks that make up files
  const blockstore: HeliaInit['blockstore'] = new MemoryBlockstore() as unknown as HeliaInit['blockstore']

  // application-specific data lives in the datastore
  const datastore: HeliaInit['datastore'] = new MemoryDatastore() as unknown as HeliaInit['datastore']

  // default is to use ipfs.io
  const delegatedClient = kuboClient({
    // use default api settings
    protocol: "https",
    port: 443,
    host: "node3.delegate.ipfs.io",
  })
  const webRtc = webRTCStar()


  // libp2p is the networking layer that underpins Helia
  const libp2p = await createLibp2p({
    peerId: getExistingPeerId(),
    datastore: datastore as unknown as MemoryDatastore,
    dht: kadDHT({                        // The DHT options (and defaults) can be found in its documentation
      kBucketSize: 20,
      clientMode: true
    }),
    transports: [
      webSockets(),
      webTransport(),
      webRtc.transport
    ],
    connectionEncryption: [
      noise()
    ],
    streamMuxers: [
      yamux(),
      mplex()
    ],
    /**
     * @see https://github.com/libp2p/js-libp2p/blob/master/doc/CONFIGURATION.md#customizing-peer-discovery
     */
    peerDiscovery: [
      webRtc.discovery,
      // bootstrap({
      //   list: [
      //     "/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN",
      //     "/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa",
      //     "/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb",
      //     "/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt"
      //   ],
      // }),
    ],
    peerRouters: [delegatedPeerRouting(delegatedClient)],
    contentRouters: [delegatedContentRouting(delegatedClient)],
    /**
       * @see https://github.com/libp2p/js-libp2p/blob/master/doc/CONFIGURATION.md#configuring-dialing
       */
    // dialer: {
    //   dialTimeout: 120000,
    // },
    /**
     * @see https://github.com/libp2p/js-libp2p/blob/master/doc/CONFIGURATION.md#configuring-connection-manager
     */
    connectionManager: {
      // Auto connect to discovered peers (limited by ConnectionManager minConnections)
      autoDial: true,
      maxConnections: 15,
      minConnections: 2,
      pollInterval: 5000,
    },
  })
  persistPeerId(libp2p.peerId)

  // create a Helia node
  return await createHelia({
    datastore,
    blockstore,
    libp2p
  })
}
