/* eslint-disable no-console */

import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { glob } from 'glob'
import itAll from 'it-all'
import type { KuboNode } from 'ipfsd-ctl'

const FIXTURE_DIRS = [
  `${process.cwd()}/test-e2e/fixtures/data/**/*.ipns-record`,
  `${process.cwd()}/test-conformance/fixtures/**/*.ipns-record`
]

export async function loadIpnsRecords (node: KuboNode): Promise<void> {
  console.info('Loading ipns records')
  let loadedIpnsRecords = 0

  for (const ipnsRecord of await glob(FIXTURE_DIRS)) {
    loadedIpnsRecords++
    console.info('Loading *.ipns-record fixture fullpath:', ipnsRecord)

    // read the ipns record
    const record: Uint8Array = await readFile(ipnsRecord)
    const key = basename(ipnsRecord, '.ipns-record').split('_')[0]
    await itAll(node.api.routing.put(`/ipns/${key}`, record, { allowOffline: true }))
  }

  console.info('loaded', loadedIpnsRecords, 'IPNS records')
}
