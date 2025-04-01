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
 * @type {import('execa').Options & { env: Record<string, string> }}
 */
const execaOptions = {
  cwd: __dirname,
  cleanup: true,
  env: {
    IPFS_PATH,
    GOLOG_LOG_LEVEL: process.env.GOLOG_LOG_LEVEL ?? 'error,*=error',
    DEBUG: 'reverse-proxy,reverse-proxy:*'
  }
}

// Make the daemon and reverseProxy variables accessible for shutdown/restart
let daemon, reverseProxy
let currentCID = ''

// Function to add dist directory to IPFS and get CID
async function addDistToIPFS () {
  log('Adding dist directory to IPFS...')
  const { stdout: cid } = await $(execaOptions)`${kuboBin} add -r -Q ${relative(cwd(), '../dist')} --cid-version 1`

  currentCID = cid.trim()
  log('sw-gateway dist CID: ', currentCID)

  const { stdout: pinStdout } = await $(execaOptions)`${kuboBin} pin add -r /ipfs/${currentCID}`
  log('pinStdout: ', pinStdout)

  // Update environment with the new CID
  const IPFS_NS_MAP = [['ipfs-host.local', `/ipfs/${currentCID}`]].map(([host, path]) => `${host}:${path}`).join(',')
  execaOptions.env.IPFS_NS_MAP = IPFS_NS_MAP

  return currentCID
}

// Function to configure IPFS settings
async function configureIPFS () {
  log('Configuring IPFS...')
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
}

// Function to start the IPFS daemon and reverse proxy
async function startServices () {
  log('Starting kubo daemon...')
  daemon = execa(kuboBin, ['daemon', '--offline'], execaOptions)

  if (daemon == null || (daemon.stdout == null || daemon.stderr == null)) {
    throw new Error('failed to start kubo daemon')
  }

  daemon.stdout.on('data', (data) => {
    daemonLog(data.toString())
  })
  daemon.stderr.on('data', (data) => {
    daemonLog.trace(data.toString())
  })

  // Check for "daemon is ready" message
  await new Promise((resolve, reject) => {
    daemon.stdout?.on('data', (data) => {
      if (data.includes('Daemon is ready')) {
        resolve(true)
        log('Kubo daemon is ready')
      }
    })
    const timeout = setTimeout(() => {
      reject(new Error('kubo daemon failed to start'))
      clearTimeout(timeout)
    }, 5000)
  })

  // Set up reverse proxy environment
  execaOptions.env = {
    ...execaOptions.env,
    TARGET_HOST: 'localhost',
    BACKEND_PORT: gatewayPort.toString(),
    PROXY_PORT: process.env.PROXY_PORT ?? '3334',
    SUBDOMAIN: `${currentCID}.ipfs`,
    DISABLE_TRY_FILES: 'true',
    X_FORWARDED_HOST: 'ipfs-host.local',
    DEBUG: process.env.DEBUG ?? 'reverse-proxy*,reverse-proxy*:trace'
  }

  log('Starting reverse proxy...')
  reverseProxy = execa('node', [`${join(__dirname, 'reverse-proxy.js')}`], execaOptions)

  reverseProxy.stdout?.on('data', (data) => {
    proxyLog(data.toString())
  })
  reverseProxy.stderr?.on('data', (data) => {
    proxyLog.trace(data.toString())
  })
}

// Function to stop running services
async function stopServices () {
  log('Stopping existing services...')

  if (reverseProxy) {
    reverseProxy.kill('SIGINT')
    await new Promise(resolve => reverseProxy.on('exit', resolve))
    log('Reverse proxy stopped')
  }

  if (daemon) {
    daemon.kill('SIGINT')
    await new Promise(resolve => daemon.on('exit', resolve))
    log('Kubo daemon stopped')
  }
}

// Function to update IPFS with new dist files
async function updateDistFiles () {
  log.trace('Checking for changes in dist directory...')

  try {
    // Get the current CID of the dist directory
    const { stdout: newCid } = await $(execaOptions)`${kuboBin} add -r -Q ${relative(cwd(), '../dist')} --cid-version 1 --only-hash`

    // If the CID hasn't changed, no need to update
    if (newCid.trim() === currentCID) {
      log.trace('No changes detected in dist directory')
      return false
    }

    log('Changes detected in dist directory. New CID:', newCid.trim())

    // Stop services, update content, and restart
    await stopServices()
    await addDistToIPFS()
    await startServices()

    return true
  } catch (error) {
    log('Error updating dist files:', error)
    return false
  }
}

// MAIN EXECUTION FLOW

// Initialize IPFS
try {
  await mkdir(IPFS_PATH, { recursive: true })
  await $(execaOptions)`${kuboBin} init`
  log('Done with IPFS init')
} catch (error) {
  log('Error during IPFS init:', error)
  process.exit(1)
}

log('Using IPFS_PATH: ', IPFS_PATH)

// Initial setup
await addDistToIPFS()
await configureIPFS()
await startServices()

const pollInterval = parseInt(process.env.POLL_INTERVAL ?? '0', 10) // Default to not polling

if (pollInterval > 0) {
  log(`Setting up polling for dist changes every ${pollInterval}ms`)
  setInterval(async () => {
    try {
      await updateDistFiles()
    } catch (error) {
      log('Error during poll interval:', error)
    }
  }, pollInterval)
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  log('Shutting down services...')
  await stopServices()
  process.exit(0)
})
