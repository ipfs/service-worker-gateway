import { HeliaInit, createHelia } from 'helia'
import type { Helia } from '@helia/interface'
import { createLibp2p } from 'libp2p'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { webSockets } from '@libp2p/websockets'
import { webTransport } from '@libp2p/webtransport'
// import { bootstrap } from '@libp2p/bootstrap'
import { MemoryBlockstore } from 'blockstore-core'
import { MemoryDatastore } from 'datastore-core'
import { delegatedPeerRouting } from "@libp2p/delegated-peer-routing";
import { delegatedContentRouting } from "@libp2p/delegated-content-routing";
import { create as kuboClient } from "kubo-rpc-client";

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
    host: "node0.delegate.ipfs.io",
  })

  // libp2p is the networking layer that underpins Helia
  const libp2p = await createLibp2p({
    datastore: datastore as unknown as MemoryDatastore,
    transports: [
      webSockets(), webTransport()
    ],
    connectionEncryption: [
      noise()
    ],
    streamMuxers: [
      yamux()
    ],
    peerRouters: [delegatedPeerRouting(delegatedClient)],
    contentRouters: [delegatedContentRouting(delegatedClient)],
  })

  // create a Helia node
  return await createHelia({
    datastore,
    blockstore,
    libp2p
  })
}
