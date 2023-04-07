import { type HeliaInit, createHelia } from 'helia'
import type { Helia } from '@helia/interface'
import { MemoryBlockstore } from 'blockstore-core'
import { LevelDatastore } from 'datastore-level'
import { MemoryDatastore } from 'datastore-core'
import type { Blockstore } from 'interface-blockstore'
// import { CID } from 'multiformats/cid'

import type { LibP2pComponents, Libp2pConfigTypes } from './types.ts'
import { getLibp2p } from './getLibp2p.ts'
import { HttpBlockstore } from './http-blockstore.ts'
import { multiaddr } from '@multiformats/multiaddr'
import { peerIdFromString } from '@libp2p/peer-id'

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
  const memBlockstore = new MemoryBlockstore()

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

  // TODO we don't get the webtransport multiaddr after a provide. TODO debug.
  const marcoServer = multiaddr('/ip4/34.221.29.193/udp/4001/quic-v1/webtransport/certhash/uEiC13IfwpbpLsAgaV3a-9JR9FDZPxPabgv-UqmAfQuHeVw/certhash/uEiAdK9M5b3NvBMINTaVbfLAjxsTMTY2x-pEQB6lPYQe-Tw/p2p/12D3KooWEKMXiNrBNi6LkNGdT7PxoGuTqFqAiQTosRHftk2vk4k7')
  await libp2p.peerStore.addressBook.add(peerIdFromString('12D3KooWEKMXiNrBNi6LkNGdT7PxoGuTqFqAiQTosRHftk2vk4k7'), [marcoServer])
  // TODO, this is to bootstrap a single http over libp2p server. We should get these peers from the router.
  await libp2p.dial(marcoServer)

  const blockstore = new HttpBlockstore(memBlockstore, libp2p)

  // create a Helia node
  const helia = await createHelia({
    datastore: datastore as unknown as HeliaInit['datastore'],
    blockstore,
    libp2p
  })

  console.log('helia peerId: ', helia.libp2p.peerId.toString())

  return helia
}
