import { type HeliaInit, createHelia } from 'helia'
import type { Helia } from '@helia/interface'
import { MemoryBlockstore } from 'blockstore-core'
import { LevelDatastore } from 'datastore-level'
import { MemoryDatastore } from 'datastore-core'
// import { CID } from 'multiformats/cid'

import type { LibP2pComponents, Libp2pConfigTypes } from './types.ts'
import { getLibp2p } from './getLibp2p.ts'

// import debug from 'debug'
// debug.enable('libp2p:websockets,libp2p:webtransport,libp2p:kad-dht,libp2p:dialer*,libp2p:connection-manager')
// debug.enable('libp2p:*:error')
// debug.enable('libp2p:connection-manager:auto-dialler')
// debug.enable('libp2p:*:error,libp2p:dialer*,libp2p:connection-manager*,libp2p:webtransport,-*:trace')
// debug.enable('libp2p:connection-manager*,libp2p:dialer*,libp2p:delegated*')
// debug.enable('libp2p:*,-*:trace')
// debug.enable('libp2p:webtransport*,libp2p:connection-manager*')

interface GetHeliaOptions {
  usePersistentDatastore?: boolean
  libp2pConfigType: Libp2pConfigTypes
}
const defaultOptions: GetHeliaOptions = {
  usePersistentDatastore: false,
  libp2pConfigType: 'ipni'
}

export async function getHelia ({ usePersistentDatastore, libp2pConfigType }: GetHeliaOptions = defaultOptions): Promise<Helia> {
  // the blockstore is where we store the blocks that make up files
  const blockstore: HeliaInit['blockstore'] = new MemoryBlockstore() as unknown as HeliaInit['blockstore']

  // application-specific data lives in the datastore
  let datastore: LibP2pComponents['datastore']

  if (usePersistentDatastore === true) {
    // use the below datastore if you want to persist your peerId and other data.
    datastore = new LevelDatastore('helia-level-datastore') as unknown as LibP2pComponents['datastore']
    await (datastore as unknown as LevelDatastore).open()
  } else {
    datastore = new MemoryDatastore() as unknown as LibP2pComponents['datastore']
  }

  // libp2p is the networking layer that underpins Helia
  const libp2p = await getLibp2p({ datastore, type: libp2pConfigType })

  libp2p.addEventListener('peer:discovery', (evt) => {
    console.log(`Discovered peer ${evt.detail.id.toString()}`)
  })

  libp2p.addEventListener('peer:connect', (evt) => {
    console.log(`Connected to ${evt.detail.remotePeer.toString()}`)
  })
  libp2p.addEventListener('peer:disconnect', (evt) => {
    console.log(`Disconnected from ${evt.detail.remotePeer.toString()}`)
  })
  console.log('peerId: ', libp2p.peerId.toString())

  // create a Helia node
  const helia = await createHelia({
    datastore: datastore as unknown as HeliaInit['datastore'],
    blockstore,
    libp2p
  })

  // setTimeout((): void => {
  //   void (async (): Promise<void> => {
  //     for await (const queryEvent of libp2p.dht.findProviders(CID.parse('bafkreiezuss4xkt5gu256vjccx7vocoksxk77vwmdrpwoumfbbxcy2zowq'))) {
  //       console.log('findProviders for video/webm CID queryEvent: ', queryEvent)
  //     }

  //     for await (const p of helia.libp2p.dht.getClosestPeers(peerIdFromPeerId(helia.libp2p.peerId).multihash.bytes)) {
  //       console.log('getClosest peers response: ', p)
  //     }
  //   })()
  // }, 20000)

  const peerConnectionHistory = new Map<string, Set<string>>()
  setInterval(() => {
    // @ts-expect-error - broken types
    helia.libp2p.components.peerStore.all().then((currentPeers) => {
      // currentPeers.forEach((p) => {
      //   console.log('peerStore peer: ', p.id.toString())
      // })
      console.log('total peers: ', currentPeers.length)
    })
    for (const connection of helia.libp2p.getConnections()) {
      const peerString = connection.remotePeer.toString()
      const addrString = connection.remoteAddr.toString()
      const peerHistory = peerConnectionHistory.get(peerString)
      if (peerHistory == null) {
        peerConnectionHistory.set(peerString, new Set())
        // void (async () => {
        //   try {
        //     for await (const p of helia.libp2p.dht.getClosestPeers(peerIdFromPeerId(connection.remotePeer).multihash.bytes)) {
        //       console.log('getClosest peers response: ', p)
        //     }
        //   } catch (error) {
        //     console.log('getClosest peers response error: ', error)
        //   }
        // })()
      } else {
        if (peerHistory.has(addrString)) {
          // ignore
        } else {
          peerHistory.add(addrString)
          peerConnectionHistory.set(peerString, peerHistory)
          console.log(`Connected to new peer-addr pair: ${peerString} at ${addrString}`)
        }
      }
      // Logs the PeerId string and the observed remote multiaddr of each Connection
    }
    console.log(`Unique count of past connected peers: ${peerConnectionHistory.size}`)
    // currentPeers.forEach((p) => {

    //     console.log('peerStore peer: ', p.id.toString())
    // })
    // console.log('total peers: ', currentPeers)
  }, 5000)

  console.log('helia peerId: ', helia.libp2p.peerId.toString())
  // log the multiaddrs for this node

  return helia
}
