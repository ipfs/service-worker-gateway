
// @ts-expect-error no types
import without from 'lodash.without'

export const connectAll = async (nodes: any[]): Promise<void> => {
  for (const node of nodes) {
    for (const otherNode of without(nodes, node)) {
      await node.libp2pNode.dial(otherNode.bitswap.peerId)
    }
  }
}
