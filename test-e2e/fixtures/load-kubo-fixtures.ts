/* eslint-disable no-console */

/**
 * This is required to update gateway-conformance fixtures
 *
 * Can only be ran from node
 *
 * external command dependencies:
 * - `docker`
 * - `npx`
 */

import { createReadStream } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, relative, resolve, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { logger } from '@libp2p/logger'
import { $ } from 'execa'
import { glob } from 'glob'
import itAll from 'it-all'
import drain from 'it-drain'
import type { KuboNode } from 'ipfsd-ctl'

const __dirname = dirname(fileURLToPath(import.meta.url))
const log = logger('kubo-init')

// This needs to match the `repo` property provided to `ipfsd-ctl` in `createKuboNode` so our kubo instance in tests use the same repo
export const kuboRepoDir = `${tmpdir()}/.ipfs/${Date.now()}`
export const GWC_FIXTURES_PATH = resolve(__dirname, '../../test-conformance/fixtures/gateway-conformance-fixtures')

export async function downloadFixtures (force = false): Promise<void> {
  if (!force) {
    // skip downloading fixtures if they are already present
    const allFixtures = await Promise.all([
      glob([`${GWC_FIXTURES_PATH}/**/*.car`]),
      glob([`${GWC_FIXTURES_PATH}/**/*.ipns-record`]),
      glob([`${GWC_FIXTURES_PATH}/dnslinks.json`])
    ])

    if (allFixtures.every(fixtures => fixtures.length > 0)) {
      console.info('Fixtures already downloaded')
      return
    }
  }

  console.info('Downloading fixtures to', relative('.', GWC_FIXTURES_PATH))

  try {
    await $`docker run -v ${process.cwd()}:/workspace -w /workspace ghcr.io/ipfs/gateway-conformance:v0.7.1 extract-fixtures --directory ${relative('.', GWC_FIXTURES_PATH)} --merged false`
  } catch (err: any) {
    if (err.message.includes('docker')) {
      throw err
    }

    log.error('error downloading fixtures, assuming current or previous success - %e', err)
  }
}

export async function getIpfsNsMap (): Promise<string> {
  const json = await readFile(`${GWC_FIXTURES_PATH}/dnslinks.json`, 'utf-8')
  const { domains } = JSON.parse(json)
  const ipfsNsMap = Object.entries(domains).map(([key, value]) => `${key}:${value}`).join(',')
  log('ipfsNsMap %s', ipfsNsMap)

  return ipfsNsMap
}

const CAR_FIXTURE_DIRS = [
  `${process.cwd()}/test-e2e/fixtures/data/**/*.car`,
  `${process.cwd()}/test-conformance/fixtures/**/*.car`
]

export async function loadCarFixtures (node: KuboNode): Promise<void> {
  // const execaOptions = getExecaOptions()
  let loadedCarFiles = 0

  for (const carFile of await glob(CAR_FIXTURE_DIRS)) {
    loadedCarFiles++
    console.info('Loading *.car fixture %s', carFile)

    await drain(node.api.dag.import([createReadStream(carFile)], {
      pinRoots: false
    }))
  }

  console.info('Loaded', loadedCarFiles, 'car files')
}

const IPNS_FIXTURE_DIRS = [
  `${process.cwd()}/test-e2e/fixtures/data/**/*.ipns-record`,
  `${process.cwd()}/test-conformance/fixtures/**/*.ipns-record`
]

export async function loadIpnsRecords (node: KuboNode): Promise<void> {
  console.info('Loading ipns records')
  let loadedIpnsRecords = 0

  for (const ipnsRecord of await glob(IPNS_FIXTURE_DIRS)) {
    loadedIpnsRecords++
    console.info('Loading *.ipns-record fixture fullpath:', ipnsRecord)

    // read the ipns record
    const record: Uint8Array = await readFile(ipnsRecord)
    const key = basename(ipnsRecord, '.ipns-record').split('_')[0]
    await itAll(node.api.routing.put(`/ipns/${key}`, record, { allowOffline: true }))
  }

  console.info('loaded', loadedIpnsRecords, 'IPNS records')
}
