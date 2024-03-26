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
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { logger } from '@libp2p/logger'
import { $ } from 'execa'
import { glob } from 'glob'

// eslint-disable-next-line @typescript-eslint/naming-convention
const __dirname = dirname(fileURLToPath(import.meta.url))

const log = logger('kubo-init')

// This needs to match the `repo` property provided to `ipfsd-ctl` in `createKuboNode` so our kubo instance in tests use the same repo
export const kuboRepoDir = resolve(__dirname, 'data/test-repo')
export const GWC_FIXTURES_PATH = resolve(__dirname, 'data/gateway-conformance-fixtures')

export async function loadKuboFixtures (): Promise<void> {
  await $`mkdir -p ${kuboRepoDir}`
  await $`mkdir -p ${GWC_FIXTURES_PATH}`

  await attemptKuboInit()

  await configureKubo()

  await downloadFixtures()

  await loadFixtures()
}

function getExecaOptions ({ cwd, ipfsNsMap }: { cwd?: string, ipfsNsMap?: string } = {}): { cwd: string, env: Record<string, string | undefined> } {
  return {
    cwd: cwd ?? __dirname,
    env: {
      IPFS_PATH: kuboRepoDir,
      IPFS_NS_MAP: ipfsNsMap
    }
  }
}

async function attemptKuboInit (): Promise<void> {
  const execaOptions = getExecaOptions()
  try {
    await $(execaOptions)`npx -y kubo init`
    log('Kubo initialized at %s', kuboRepoDir)
  } catch (e: any) {
    if (e.stderr?.includes('ipfs daemon is running') === true) {
      log('Kubo is already running')
      return
    }
    if (e.stderr?.includes('already exists!') === true) {
      log('Kubo was already initialized at %s', kuboRepoDir)
      return
    }

    throw e
  }
}

async function configureKubo (): Promise<void> {
  const execaOptions = getExecaOptions()
  try {
    await $(execaOptions)`npx -y kubo config Addresses.Gateway /ip4/127.0.0.1/tcp/0`
    await $(execaOptions)`npx -y kubo config Addresses.API /ip4/127.0.0.1/tcp/0`
    await $(execaOptions)`npx -y kubo config --json Gateway.NoFetch true`
    await $(execaOptions)`npx -y kubo config --json Gateway.ExposeRoutingAPI true`
    await $(execaOptions)`npx -y kubo config --json Gateway.HTTPHeaders.Access-Control-Allow-Origin '["*"]'`
    await $(execaOptions)`npx -y kubo config --json Gateway.HTTPHeaders.Access-Control-Allow-Methods '["GET", "POST", "PUT", "OPTIONS"]'`
    log('Kubo configured')
  } catch (e) {
    log.error('Failed to configure Kubo', e)
  }
}

async function downloadFixtures (force = false): Promise<void> {
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
    await $`docker run -v ${process.cwd()}:/workspace -w /workspace ghcr.io/ipfs/gateway-conformance:v0.4.2 extract-fixtures --directory ${relative('.', GWC_FIXTURES_PATH)} --merged false`
  } catch (e) {
    log.error('Error downloading fixtures, assuming current or previous success', e)
  }
}

async function loadFixtures (): Promise<string> {
  const execaOptions = getExecaOptions()

  for (const carFile of await glob([`${resolve(__dirname, 'data')}/**/*.car`])) {
    log('Loading *.car fixture %s', carFile)
    const { stdout } = await $(execaOptions)`npx -y kubo dag import --pin-roots=false --offline ${carFile}`
    stdout.split('\n').forEach(log)
  }

  // TODO: re-enable this when we resolve CI issue: see https://github.com/ipfs-shipyard/service-worker-gateway/actions/runs/8442583023/job/23124336180?pr=159#step:6:13
  // for (const ipnsRecord of await glob([`${GWC_FIXTURES_PATH}/**/*.ipns-record`])) {
  //   const key = basename(ipnsRecord, '.ipns-record')
  //   const relativePath = relative(GWC_FIXTURES_PATH, ipnsRecord)
  //   log('Loading *.ipns-record fixture %s', relativePath)
  //   const { stdout } = await $(({ ...execaOptions }))`cd ${GWC_FIXTURES_PATH} && npx -y kubo routing put --allow-offline "/ipns/${key}" "${relativePath}"`
  //   stdout.split('\n').forEach(log)
  // }

  const json = await readFile(`${GWC_FIXTURES_PATH}/dnslinks.json`, 'utf-8')
  const { subdomains, domains } = JSON.parse(json)
  const subdomainDnsLinks = Object.entries(subdomains).map(([key, value]) => `${key}.example.com:${value}`).join(',')
  const domainDnsLinks = Object.entries(domains).map(([key, value]) => `${key}:${value}`).join(',')
  const ipfsNsMap = `${domainDnsLinks},${subdomainDnsLinks}`

  // TODO: provide this to kubo instance in tests
  return ipfsNsMap
}
