import { type HeliaInit, createHelia } from 'helia'
import type { Helia } from '@helia/interface'
import { MemoryBlockstore } from 'blockstore-core'
import { LevelDatastore } from 'datastore-level'
import { MemoryDatastore } from 'datastore-core'
import type { MultihashHasher } from 'multiformats/hashes/interface'
import { createBitswapWithHTTP } from 'ipfs-bitswap'
import { sha256, sha512 } from 'multiformats/hashes/sha2'
import { identity } from 'multiformats/hashes/identity'
import { multiaddr } from '@multiformats/multiaddr'
import { peerIdFromString } from '@libp2p/peer-id'

import type { LibP2pComponents, Libp2pConfigTypes } from './types.ts'
import { getLibp2p } from './getLibp2p.ts'

import debug from 'debug'
debug.enable('libp2p:websockets,libp2p:webtransport,libp2p:kad-dht,libp2p:dialer*,libp2p:connection-manager')
debug.enable('libp2p:*:error')
debug.enable('libp2p:connection-manager:auto-dialler')
debug.enable('libp2p:*:error,libp2p:dialer*,libp2p:connection-manager*,libp2p:webtransport,-*:trace')
debug.enable('libp2p:connection-manager*,libp2p:dialer*,libp2p:delegated*')
debug.enable('libp2p:*,-*:trace')
debug.enable('libp2p:webtransport*,libp2p:connection-manager*')

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
  const blockstore = new MemoryBlockstore()

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

  await libp2p.handle('/libp2p-http', (streamData) => {
    // We don't do anything here. We just need this to set outbound stream limit
    streamData.stream.close()
  }, {
    maxInboundStreams: 1,
    maxOutboundStreams: 4096
  })

  const hashers: MultihashHasher[] = [
    sha256,
    sha512,
    identity
  ]

  const httpBitswap = createBitswapWithHTTP(libp2p, blockstore, {
    bootstrapHttpOnlyPeers: [
      // 'https://cloudflare-ipfs.com'
      // 'https://ipfs.io'
    ],
    bitswapOptions: {
      hashLoader: {
        getHasher: async (codecOrName: string | number) => {
          const hasher = hashers.find(hasher => {
            return hasher.code === codecOrName || hasher.name === codecOrName
          })

          if (hasher != null) {
            return await Promise.resolve(hasher)
          }

          throw new Error(`Could not load hasher for code/name "${codecOrName}"`)
        }
      }
    }
  })

  // TODO remove this hardcoded bootstrap peer for the http over libp2p part
  console.log('Trying to connect to marco server')
  const marcoServer = multiaddr('/ip4/34.221.29.193/udp/4001/quic-v1/webtransport/certhash/uEiCuO-L9hgcyX0W8InuEddnpCZgrKM0nDuhbHmfLZS1yhg/certhash/uEiCCZxrd830q5k_tLX86jl6DK4qCTdKsH0M_T4nQGlu08Q/p2p/12D3KooWEBQi1GAUt1Ypftkvv1y2G9L2QHvjJ9A8oWRTDSnLwWLe')
  // const marcoServer = multiaddr('/ip4/127.0.0.1/udp/50437/quic-v1/webtransport/certhash/uEiAPjcNVdQF4x2CVYQV27BXePeXzv-9WtJZ_-Zn793tBdw/certhash/uEiAEGdW1-_kQC2Zm0Fd1m2tCeTFksJZLv1ZDL9gBTIBXow/p2p/12D3KooWDpJ7As7BWAwRMfu1VU2WCqNjvq387JEYKDBj4kx6nXTN')
  // await libp2p.peerStore.addressBook.add(peerIdFromString('12D3KooWEBQi1GAUt1Ypftkvv1y2G9L2QHvjJ9A8oWRTDSnLwWLe'), [marcoServer])
  // TODO, this is to bootstrap a single http over libp2p server. We should get these peers from the router.
  await libp2p.dial(marcoServer).then(() => {
    console.log('Marco server connected')
    // Keep alive with ping
    const i = setInterval(() => {
      libp2p.ping(peerIdFromString('12D3KooWEBQi1GAUt1Ypftkvv1y2G9L2QHvjJ9A8oWRTDSnLwWLe'))
        .then((res) => {
          console.log('pinged marcoServer', res)
        })
        .catch(err => {
          clearInterval(i)
          console.log('error pinging marcoServer', err)
        })
    }, 3e3)
  }).catch(err => { console.log('error dialing marcoServer', err) })
  await new Promise(resolve => setTimeout(resolve, 1e3))

  // create a Helia node
  const helia = await createHelia({
    datastore: datastore as unknown as HeliaInit['datastore'],
    blockstore,
    bitswap: httpBitswap,
    libp2p
  })

  console.log('helia peerId: ', helia.libp2p.peerId.toString())

  return helia
}
