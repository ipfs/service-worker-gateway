/* eslint-env mocha */
/* eslint-disable no-console */

import { expect } from 'aegir/chai'
import { makeBlocks } from '../utils/make-blocks.js'
import { genBitswapNetwork } from '../utils/mocks.js'

describe('gen Bitswap network', function () {
  // CI is very slow
  this.timeout(300 * 1000)

  describe('distributed blocks', () => {
    it('with 2 nodes', async () => {
      const numNodes = 2
      const blocksPerNode = 10
      const nodeArr = await genBitswapNetwork(numNodes)

      // -- actual test
      await exchangeBlocks(nodeArr, blocksPerNode)
      await Promise.all(nodeArr.map(async node => {
        await node.bitswap.stop()
        await node.libp2p.stop()
      }))
    })
  })
})

async function exchangeBlocks (nodes: any[], blocksPerNode: number = 10): Promise<void> {
  const blocks = await makeBlocks(nodes.length * blocksPerNode)

  const cids = blocks.map((b) => b.cid)

  // put blocksPerNode amount of blocks per node
  await Promise.all(nodes.map(async (node, i) => {
    await node.bitswap.start()

    const data = new Array(blocksPerNode).fill(0).map((_, j) => {
      const index = i * blocksPerNode + j
      return blocks[index]
    })

    await Promise.all(data.map((d) => node.bitswap.put(d.cid, d.block)))
  }))

  const d = Date.now()

  // fetch all blocks on every node
  await Promise.all(nodes.map(async (node) => {
    const bs = await Promise.all(cids.map((cid) => node.bitswap.want(cid)))
    expect(bs).to.deep.equal(blocks.map(b => b.block))
  }))

  console.log('  time -- %s', (Date.now() - d))
}
