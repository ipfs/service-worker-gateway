/* eslint-disable no-console */

import type { EventEmitter } from 'node:events'
import stats from 'stats-lite'

export const print = (suite: any, emitter: EventEmitter): void => {
  const elapseds: number[] = []
  emitter.once('start', () => {
    console.log('\n------------------------')
    console.log(suite)
    console.log('started')
  })
  emitter.once('all connected', () => {
    console.log('all nodes connected to each other')
  })
  emitter.on('getting many', () => {
    process.stdout.write('.')
  })
  emitter.once('stop', () => {
    console.log('\nstopping')
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
    process.stdout.write('+')
    elapseds.push(elapsed)
  })
}
