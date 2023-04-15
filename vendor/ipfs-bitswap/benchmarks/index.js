/* eslint-disable no-console */

import assert from 'assert'
import range from 'lodash.range'
import { makeBlocks } from '../test/utils/make-blocks.js'
import { genBitswapNetwork } from '../test/utils/mocks.js'

const nodes = [2, 5, 10, 20]
const blockFactors = [1, 10, 100]

;(async function () {
  console.log('-- start')
  await Promise.all(
    nodes.map(async nodeCount => {
      await Promise.all(
        blockFactors.map(async blockFactor => {
          const nodeArr = await genBitswapNetwork(nodeCount)
          await round(nodeArr, blockFactor, nodeCount)
          await shutdown(nodeArr)
        })
      )
    })
  )

  console.log('-- finished')
})()

async function shutdown (nodeArr) {
  await Promise.all(
    nodeArr.map(async node => {
      await node.bitswap.stop()
      await node.libp2p.stop()
    })
  )
}

async function round (nodeArr, blockFactor, n) {
  const blocks = await makeBlocks(n * blockFactor)
  const cids = blocks.map((b) => b.cid)

  console.info('put blockFactor amount of blocks per node')

  await Promise.all(
    nodeArr.map(async (node, i) => {
      await node.bitswap.start()

      await Promise.all(
        range(blockFactor).map(async j => {
          const index = i * blockFactor + j

          await node.bitswap.put(blocks[index])
        })
      )
    })
  )

  console.info('fetch all blocks on every node')

  const d = Date.now()

  await Promise.all(
    nodeArr.map(async node => {
      let count = 0

      for await (const _ of node.bitswap.getMany(cids)) { // eslint-disable-line no-unused-vars
        count++
      }

      assert(count === blocks.length)
    })
  )

  console.log('  %s nodes - %s blocks/node - %sms', n, blockFactor, Date.now() - d)
}
