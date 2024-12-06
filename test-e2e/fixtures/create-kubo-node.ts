import { createNode, type KuboNode } from 'ipfsd-ctl'
import { path as kuboPath } from 'kubo'
import { create } from 'kubo-rpc-client'
import { kuboRepoDir } from './load-kubo-fixtures.js'

export async function createKuboNode (): Promise<KuboNode> {
  return createNode({
    type: 'kubo',
    bin: kuboPath(),
    rpc: create,
    test: true,
    repo: kuboRepoDir,
    args: []
  })
}
