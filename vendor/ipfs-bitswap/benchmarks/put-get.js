/* eslint max-nested-callbacks: ["error", 5] */
/* eslint-disable no-console */

import Benchmark from 'benchmark'
import assert from 'assert'
import all from 'it-all'
import drain from 'it-drain'
import { makeBlocks } from '../test/utils/make-blocks.js'
import { genBitswapNetwork } from '../test/utils/mocks.js'

const suite = new Benchmark.Suite('put-get')

const blockCounts = [1, 10, 1000]
const blockSizes = [10, 1024, 10 * 1024]

;(async function () {
  const [
    node
  ] = await genBitswapNetwork(1)

  const bitswap = node.bitswap

  blockCounts.forEach((n) => blockSizes.forEach((k) => {
    suite.add(`put-get ${n} blocks of size ${k}`, async (defer) => {
      const blocks = await makeBlocks(n, k)

      await drain(bitswap.putMany(blocks))

      const res = await all(bitswap.getMany(blocks.map(block => block.cid)))

      assert(res.length === blocks.length)

      defer.resolve()
    }, {
      defer: true
    })
  }))

  suite
    .on('cycle', (event) => {
      console.log(String(event.target))
    })
    .on('complete', () => {
      process.exit()
    })
    .run({
      async: true
    })
})()
