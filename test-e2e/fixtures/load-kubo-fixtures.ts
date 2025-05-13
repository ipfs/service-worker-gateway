/**
 * This is required to update gateway-conformance fixtures
 *
 * Can only be ran from node
 *
 * external command dependencies:
 * - `docker`
 * - `npx`
 */

import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { logger } from '@libp2p/logger'
import { $ } from 'execa'
import { glob } from 'glob'

// eslint-disable-next-line @typescript-eslint/naming-convention
const __dirname = dirname(fileURLToPath(import.meta.url))

const log = logger('kubo-init')

// This needs to match the `repo` property provided to `ipfsd-ctl` in `createKuboNode` so our kubo instance in tests use the same repo
export const kuboRepoDir = `${tmpdir()}/.ipfs/${Date.now()}`
export const GWC_FIXTURES_PATH = resolve(__dirname, 'data/gateway-conformance-fixtures')

function getExecaOptions ({ cwd, ipfsNsMap }: { cwd?: string, ipfsNsMap?: string } = {}): { cwd: string, env: Record<string, string | undefined> } {
  return {
    cwd: cwd ?? __dirname,
    env: {
      IPFS_PATH: kuboRepoDir,
      IPFS_NS_MAP: ipfsNsMap
    }
  }
}

export async function downloadFixtures (force = false): Promise<void> {
  if (!force) {
  // if the fixtures are already downloaded, we don't need to download them again
    const allFixtures = await glob([`${GWC_FIXTURES_PATH}/**/*.car`, `${GWC_FIXTURES_PATH}/**/*.ipns-record`, `${GWC_FIXTURES_PATH}/dnslinks.json`])
    if (allFixtures.length > 0) {
      log('Fixtures already downloaded')
      return
    }
  }

  log('Downloading fixtures')
  try {
    await $`docker run -v ${process.cwd()}:/workspace -w /workspace ghcr.io/ipfs/gateway-conformance:v0.7.1 extract-fixtures --directory ${relative('.', GWC_FIXTURES_PATH)} --merged false`
  } catch (e) {
    log.error('Error downloading fixtures, assuming current or previous success', e)
  }
}

export async function getIpfsNsMap (): Promise<string> {
  const json = await readFile(`${GWC_FIXTURES_PATH}/dnslinks.json`, 'utf-8')
  const { domains } = JSON.parse(json)
  const ipfsNsMap = Object.entries(domains).map(([key, value]) => `${key}:${value}`).join(',')
  log('ipfsNsMap %s', ipfsNsMap)

  return ipfsNsMap
}

export async function loadCarFixtures (): Promise<void> {
  const execaOptions = getExecaOptions()

  for (const carFile of await glob([`${resolve(__dirname, 'data')}/**/*.car`])) {
    if (carFile.includes('gateway-requests')) {
      // log('Skipping gateway-requests fixture %s', carFile)
      continue
    }
    log('Loading *.car fixture %s', carFile)
    try {
      const { stdout, stderr } = await $(execaOptions)`npx -y kubo dag import --pin-roots=false --offline ${carFile}`
      stdout.split('\n').forEach(log)
      stderr.split('\n').forEach(log.error)
    } catch (e) {
      log.error('Error loading car fixture %s', carFile, e)
      // maybe delete the file?
    }
  }
}
