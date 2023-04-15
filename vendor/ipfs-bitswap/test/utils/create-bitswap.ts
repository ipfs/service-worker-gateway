
import { DefaultBitswap } from '../../src/bitswap.js'
import { MemoryBlockstore } from 'blockstore-core/memory'
import { createLibp2pNode } from './create-libp2p-node.js'
import type { BitswapNode } from './mocks.js'

export const createBitswap = async (): Promise<BitswapNode> => {
  const libp2p = await createLibp2pNode({
    DHT: true
  })
  const blockstore = new MemoryBlockstore()
  const bitswap = new DefaultBitswap(libp2p, blockstore)
  await bitswap.start()
  return { bitswap, libp2p, blockstore }
}
