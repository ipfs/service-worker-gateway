/* eslint-disable no-console */
/**
 * This file is used to simulate hosting the dist folder on an ipfs gateway, so we can handle _redirects
 */
import { mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'
import { cwd } from 'node:process'
import { fileURLToPath } from 'node:url'
import { logger } from '@libp2p/logger'
import { $, execa } from 'execa'
import { path } from 'kubo'

const log = logger('ipfs-host.local')
const daemonLog = logger('ipfs-host.local:kubo')
const proxyLog = logger('ipfs-host.local:proxy')
const __dirname = dirname(fileURLToPath(import.meta.url))
const tempDir = tmpdir()
const IPFS_PATH = `${tempDir}/.ipfs/${Date.now()}`
const kuboBin = path()

const gatewayPort = Number(process.env.GATEWAY_PORT ?? 8088)

/**
 * @type {import('execa').Options}
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

// @ts-expect-error - overwriting type of NodeJS.ProcessEnv
execaOptions.env = {
  ...execaOptions.env,
  TARGET_HOST: 'localhost',
  BACKEND_PORT: gatewayPort.toString(),
  PROXY_PORT: process.env.PROXY_PORT ?? '3334',
  SUBDOMAIN: `${cid.trim()}.ipfs`,
  DISABLE_TRY_FILES: 'true',
  X_FORWARDED_HOST: 'ipfs-host.local',
  DEBUG: process.env.DEBUG ?? 'reverse-proxy*,reverse-proxy*:trace'
}
const reverseProxy = execa('node', [`${join(__dirname, 'reverse-proxy.js')}`], execaOptions)

reverseProxy.stdout?.on('data', (data) => {
  proxyLog(data.toString())
})
reverseProxy.stderr?.on('data', (data) => {
  proxyLog.trace(data.toString())
})
