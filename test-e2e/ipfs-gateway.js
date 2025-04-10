/* eslint-disable no-console */
/**
 * This file is used to simulate hosting the dist folder on an ipfs gateway, so we can handle _redirects
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { cwd } from 'node:process'
import { fileURLToPath } from 'node:url'
import { logger } from '@libp2p/logger'
import { $, execa } from 'execa'
import { glob } from 'glob'
import { path } from 'kubo'
import { createReverseProxy } from './reverse-proxy.js'

const log = logger('ipfs-host.local')
const daemonLog = logger('ipfs-host.local:kubo')
const proxyLog = logger('ipfs-host.local:proxy')
const __dirname = dirname(fileURLToPath(import.meta.url))
const tempDir = tmpdir()
const IPFS_PATH = `${tempDir}/.ipfs/${Date.now()}`
const kuboBin = path()

const gatewayPort = Number(process.env.GATEWAY_PORT ?? 8088)

/**
 * @type {import('execa').Options & { env: Record<string, string | undefined> }}
 */
const execaOptions = {
  cwd: __dirname,
  cleanup: true,
  env: {
    IPFS_PATH,
    GOLOG_LOG_LEVEL: process.env.GOLOG_LOG_LEVEL ?? 'debug,*=debug',
    DEBUG: 'reverse-proxy,reverse-proxy:*'
  }
}

try {
  await mkdir(IPFS_PATH, { recursive: true })
  await $(execaOptions)`${kuboBin} init`
  log('done with init')
} catch (_) {
  // ignore
}
log('using IPFS_PATH: ', IPFS_PATH)

/**
 * cloudflare redirects and Kubo gateway redirects are different, so we need to replace the dist/_redirects with dist/_kubo_redirects before adding to IPFS
 */
const kuboRedirects = await readFile(join(cwd(), './dist/_kubo_redirects'), 'utf-8')

await writeFile(join(cwd(), './dist/_redirects'), kuboRedirects)

const { stdout: cid } = await $(execaOptions)`${kuboBin} add -r -Q ${relative(cwd(), '../dist')} --cid-version 1`

log('sw-gateway dist CID: ', cid.trim())
const { stdout: pinStdout } = await $(execaOptions)`${kuboBin} pin add -r /ipfs/${cid.trim()}`
log('pinStdout: ', pinStdout)

const IPFS_NS_MAP = [['ipfs-host.local', `/ipfs/${cid.trim()}`]].map(([host, path]) => `${host}:${path}`).join(',')

// @ts-expect-error - it's defined.
execaOptions.env.IPFS_NS_MAP = IPFS_NS_MAP

await $(execaOptions)`${kuboBin} config Addresses.Gateway /ip4/127.0.0.1/tcp/${gatewayPort}`
await $(execaOptions)`${kuboBin} config Addresses.API /ip4/127.0.0.1/tcp/0`
await $(execaOptions)`${kuboBin} config --json Bootstrap ${JSON.stringify([])}`
await $(execaOptions)`${kuboBin} config --json Swarm.DisableNatPortMap true`
await $(execaOptions)`${kuboBin} config --json Discovery.MDNS.Enabled false`
await $(execaOptions)`${kuboBin} config --json Gateway.NoFetch true`
await $(execaOptions)`${kuboBin} config --json Gateway.DeserializedResponses true`
await $(execaOptions)`${kuboBin} config --json Gateway.ExposeRoutingAPI false`
await $(execaOptions)`${kuboBin} config --json Gateway.HTTPHeaders.Access-Control-Allow-Origin ${JSON.stringify(['*'])}`
await $(execaOptions)`${kuboBin} config --json Gateway.HTTPHeaders.Access-Control-Allow-Methods  ${JSON.stringify(['GET', 'POST', 'PUT', 'OPTIONS'])}`

const FIXTURES_DATA_PATH = resolve(__dirname, 'fixtures', 'data')
const GWC_FIXTURES_PATH = resolve(FIXTURES_DATA_PATH, 'gateway-conformance-fixtures')
for (const carFile of await glob([`${resolve(__dirname, 'fixtures', 'data')}/**/*.car`])) {
  log('Loading *.car fixture %s', carFile)
  const { stdout } = await $(execaOptions)`${kuboBin} dag import --pin-roots=false --offline ${carFile}`
  stdout.split('\n').forEach(log)
}

async function downloadFixtures (force = false) {
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

async function loadFixtures () {
  for (const carFile of await glob([`${FIXTURES_DATA_PATH}/**/*.car`])) {
    log('Loading *.car fixture %s', carFile)
    const { stdout } = await $(execaOptions)`npx -y kubo dag import --pin-roots=false --offline ${carFile}`
    stdout.split('\n').forEach(log)
  }

  // TODO: re-enable this when we resolve CI issue: see https://github.com/ipfs-shipyard/service-worker-gateway/actions/runs/8442583023/job/23124336180?pr=159#step:6:13
  for (const ipnsRecord of await glob([`${FIXTURES_DATA_PATH}/**/*.ipns-record`])) {
    const key = basename(ipnsRecord, '.ipns-record')
    const relativePath = relative(FIXTURES_DATA_PATH, ipnsRecord)
    log('Loading *.ipns-record fixture %s', relativePath)
    const { stdout } = await $(({ ...execaOptions }))`cd ${GWC_FIXTURES_PATH} && npx -y kubo routing put --allow-offline "/ipns/${key}" "${relativePath}"`
    stdout.split('\n').forEach(log)
  }

  const json = await readFile(`${GWC_FIXTURES_PATH}/dnslinks.json`, 'utf-8')
  const { subdomains, domains } = JSON.parse(json)
  const subdomainDnsLinks = Object.entries(subdomains).map(([key, value]) => `${key}.example.com:${value}`).join(',')
  const domainDnsLinks = Object.entries(domains).map(([key, value]) => `${key}:${value}`).join(',')
  const ipfsNsMap = `${domainDnsLinks},${subdomainDnsLinks}`

  // TODO: provide this to kubo instance in tests
  return ipfsNsMap
}

await downloadFixtures()
const ipfsNsMap = await loadFixtures()

execaOptions.env.IPFS_NS_MAP = ipfsNsMap

log('starting kubo')
// need to stand up kubo daemon to serve the dist folder
const daemon = execa(kuboBin, ['daemon', '--offline'], execaOptions)

if (daemon == null || (daemon.stdout == null || daemon.stderr == null)) {
  throw new Error('failed to start kubo daemon')
}
daemon.stdout.on('data', (data) => {
  daemonLog(data.toString())
})
daemon.stderr.on('data', (data) => {
  daemonLog.trace(data.toString())
})

// check for "daemon is ready" message
await new Promise((resolve, reject) => {
  daemon.stdout?.on('data', (data) => {
    if (data.includes('Daemon is ready')) {
      // @ts-expect-error - nothing needed here.
      resolve()
      log('Kubo daemon is ready')
    }
  })
  const timeout = setTimeout(() => {
    reject(new Error('kubo daemon failed to start'))
    clearTimeout(timeout)
  }, 5000)
})

// Create and start the reverse proxy
const proxyPort = Number(process.env.PROXY_PORT ?? '3334')

createReverseProxy({
  targetHost: 'localhost',
  backendPort: gatewayPort,
  proxyPort,
  subdomain: `${cid.trim()}.ipfs`,
  disableTryFiles: true,
  xForwardedHost: 'ipfs-host.local',
  log: proxyLog
})
