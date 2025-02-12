import { logger } from '@libp2p/logger'
import { createNode, type KuboNode } from 'ipfsd-ctl'
import { path as kuboPath } from 'kubo'
import { create } from 'kubo-rpc-client'
import { kuboRepoDir } from './load-kubo-fixtures.js'
export async function createKuboNode (): Promise<KuboNode> {
  const node = await createNode({
    type: 'kubo',
    bin: kuboPath(),
    rpc: create,
    test: true,
    repo: kuboRepoDir,
    args: []
  })
  const log = logger('kubo-node')

  // log the gateway info
  const info = await node.info()
  log('node info %O', info)

  return node
}
