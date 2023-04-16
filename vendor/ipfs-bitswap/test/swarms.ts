
/* eslint-env mocha */
/* eslint-disable no-console */

import stats from 'stats-lite'
import { distributionTest } from './utils/distribution-test.js'
import { EventEmitter } from 'events'

const test = it

describe.skip('swarms', () => {
  const print = Boolean(process.env.PRINT)
  let emitter: EventEmitter

  before(() => {
    emitter = new EventEmitter()
  })

  after(() => {
    process.exit()
  })

  test('2 nodes, 2 blocks', async function () {
    this.timeout(10 * 1000)

    maybePrint('2 nodes, 2 blocks', emitter)

    await distributionTest(2, 2, 1, emitter)
  })

  test('10 nodes, 2 blocks', async function () {
    this.timeout(30 * 1000)

    maybePrint('10 nodes, 2 blocks', emitter)

    await distributionTest(10, 2, 1, emitter)
  })

  test('10 nodes, 10 blocks', async function () {
    this.timeout(30 * 1000)

    maybePrint('10 nodes, 10 blocks', emitter)

    await distributionTest(10, 10, 1, emitter)
  })

  test('10 nodes, 20 blocks', async function () {
    this.timeout(30 * 1000)

    maybePrint('10 nodes, 20 blocks', emitter)

    await distributionTest(10, 20, 1, emitter)
  })

  test('50 nodes, 2 blocks', async function () {
    this.timeout(600 * 1000)

    maybePrint('50 nodes, 2 blocks', emitter)

    await distributionTest(50, 2, 1, emitter)
  })

  test.skip('100 nodes, 2 blocks', async function () {
    this.timeout(600 * 1000)
    maybePrint('100 nodes, 2 blocks', emitter)

    await distributionTest(100, 2, 1, emitter)
  })

  test('10 nodes, 100 blocks', async function () {
    this.timeout(600 * 1000)
    maybePrint('10 nodes, 100 blocks', emitter)

    await distributionTest(10, 100, 1, emitter)
  })

  function maybePrint (suite: any, emitter: EventEmitter): void {
    if (!print) {
      return
    }
    const elapseds: number[] = []
    emitter.once('start', () => {
      console.log('\n------------------------')
      console.log(suite)
      console.log('started')
    })
    emitter.once('all connected', () => {
      console.log('all nodes connected to each other')
    })
    emitter.once('stop', () => {
      console.log('stopping')
    })
    emitter.once('stopped', () => {
      console.log('stopped')
      console.log('stats:')
      console.log('---------')
      console.log('mean: %s', stats.mean(elapseds))
      console.log('median: %s', stats.median(elapseds))
      console.log('variance: %s', stats.variance(elapseds))
      console.log('standard deviation: %s', stats.stdev(elapseds))
      console.log('85th percentile: %s', stats.percentile(elapseds, 0.85))
    })

    emitter.on('got block', (elapsed) => {
      elapseds.push(elapsed)
    })
  }
})
