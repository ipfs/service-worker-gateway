import { createController, type Controller } from 'ipfsd-ctl'
import { path as kuboPath } from 'kubo'
import * as kuboRpcClient from 'kubo-rpc-client'
import { kuboRepoDir } from './load-kubo-fixtures.js'

export async function createKuboNode (): Promise<Controller> {
  return createController({
    kuboRpcModule: kuboRpcClient,
    ipfsBin: kuboPath(),
    test: true,
    ipfsOptions: {
      repo: kuboRepoDir
    },
    args: ['--enable-pubsub-experiment', '--enable-namesys-pubsub']
  })
}
