
/** @type {(n:number) => any[]} */
// @ts-expect-error no types
import range from 'lodash.range'
import { expect } from 'aegir/chai'
import { createBitswap } from './create-bitswap.js'
import { makeBlocks } from './make-blocks.js'
import { connectAll } from './connect-all.js'
import type { BitswapNode } from './mocks.js'

export const distributionTest = async (instanceCount: number, blockCount: number, repeats: number, events: any): Promise<void> => {
  let pendingRepeats = repeats

  const nodes: BitswapNode[] = await Promise.all(range(instanceCount).map(async () => await createBitswap()))
  events.emit('start')

  await connectAll(nodes)

  events.emit('all connected')

  while (pendingRepeats > 0) {
    const first = nodes[0]
    const blocks = await makeBlocks(blockCount)

    await Promise.all(
      blocks.map(async block => { await first.blockstore.put(block.cid, block.block) })
    )

    events.emit('first put')

    const results = await Promise.all(
      nodes.map(async node => {
        events.emit('getting many')

        const cids = blocks.map((block) => block.cid)
        const start = Date.now()
        const result = await Promise.all(cids.map(async cid => await node.bitswap.want(cid)))
        const elapsed = Date.now() - start
        events.emit('got block', elapsed)

        return result
      })
    )

    try {
      expect(results).have.lengthOf(instanceCount)

      for (const nodeBlocks of results) {
        expect(nodeBlocks).to.have.lengthOf(blocks.length)
        nodeBlocks.forEach((block, i) => {
          expect(block).to.deep.equal(blocks[i].block)
        })
      }
    } finally {
      pendingRepeats--
    }
  }

  events.emit('stop')

  await Promise.all(
    nodes.map(async node => {
      await node.bitswap.stop()
      await node.libp2p.stop()
    })
  )

  events.emit('stopped')
}
