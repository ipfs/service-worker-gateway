
/* eslint-disable no-console */

import { distributionTest } from '../utils/distribution-test'
import { print } from './helpers/print-swarm-results'
import { EventEmitter } from 'events'

void (async function (): Promise<void> {
  const emitter = new EventEmitter()

  print('10 nodes, 10 blocks, 5 iterations', emitter)

  await distributionTest(10, 10, 5, emitter)

  console.log('Finished. Can kill now...')
})()
