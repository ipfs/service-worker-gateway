import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { glob } from 'glob'
import itAll from 'it-all'
import type { Logger } from '@libp2p/logger'
import type { KuboNode } from 'ipfsd-ctl'

export async function loadIpnsRecords (node: KuboNode, log?: Logger): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('loading ipns records')
  let loadedIpnsRecords = 0
  for (const ipnsRecord of await glob([`${process.cwd()}/test-e2e/fixtures/data/**/*.ipns-record`])) {
    loadedIpnsRecords++
    log?.('Loading *.ipns-record fixture fullpath: %s', ipnsRecord)
    // read the ipns record
    const record: Uint8Array = await readFile(ipnsRecord)
    const key = basename(ipnsRecord, '.ipns-record').split('_')[0]
    await itAll(node.api.routing.put(`/ipns/${key}`, record, { allowOffline: true }))
  }
  log?.('Loaded %d ipns records', loadedIpnsRecords)
  // eslint-disable-next-line no-console
  console.log('loaded %d ipns records', loadedIpnsRecords)
}
