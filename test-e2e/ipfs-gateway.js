/* eslint-disable no-console */
/**
 * This file is used to simulate hosting the dist folder on an ipfs gateway, so we can handle _redirects
 */
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'
import { cwd } from 'node:process'
import { fileURLToPath } from 'node:url'
// import { execa, $ } from 'execa'
import { $, execa } from 'execa'
import { path } from 'kubo'

const __dirname = dirname(fileURLToPath(import.meta.url))
const tempDir = tmpdir()
const IPFS_PATH = `${tempDir}/.ipfs`
const kuboBin = path()

const gatewayPort = Number(process.env.GATEWAY_PORT ?? 8088)

/**
 * @type {import('execa').Options}
 */
const execaOptions = {
  cwd: __dirname,
  // cleanup: true,
  env: {
    IPFS_PATH,
    GOLOG_LOG_LEVEL: 'debug'
  }
}

try {
  await $(execaOptions)`${kuboBin} init --profile test`
} catch (_) {
  // ignore
}
console.log('using IPFS_PATH: ', IPFS_PATH)
const { stdout: cid } = await $(execaOptions)`${kuboBin} add -r -Q ${relative(cwd(), '../dist')} --cid-version 1`

console.log('sw-gateway dist CID: ', cid.trim())

// write dist cid to file
// await writeFile(join(__dirname, 'dist.cid'), cid.trim())

await $(execaOptions)`${kuboBin} config Addresses.Gateway /ip4/127.0.0.1/tcp/${gatewayPort}`
await $(execaOptions)`${kuboBin} config Addresses.API /ip4/127.0.0.1/tcp/0`
// await $(execaOptions)`${kuboBin} config --json Bootstrap ${JSON.stringify([])}`
// await $(execaOptions)`${kuboBin} config --json Swarm.DisableNatPortMap true`
// await $(execaOptions)`${kuboBin} config --json Discovery.MDNS.Enabled false`
// await $(execaOptions)`${kuboBin} config --json Gateway.NoFetch true`
// await $(execaOptions)`${kuboBin} config --json Gateway.DeserializedResponses true`
// await $(execaOptions)`${kuboBin} config --json Gateway.ExposeRoutingAPI false`
await $(execaOptions)`${kuboBin} config --json Gateway.HTTPHeaders.Access-Control-Allow-Origin ${JSON.stringify(['*'])}`
await $(execaOptions)`${kuboBin} config --json Gateway.HTTPHeaders.Access-Control-Allow-Methods  ${JSON.stringify(['GET', 'POST', 'PUT', 'OPTIONS'])}`
await $(execaOptions)`${kuboBin} config --json Gateway.PublicGateways ${JSON.stringify({
  'localhost:3334': {
    RootRedirect: 'index.html',
    NoDNSLink: true,
    Paths: []
  }
})}`
console.log('starting kubo')
// need to stand up kubo daemon to serve the dist folder
// const { stdout: daemonStartupStdin, stderr: daemonStartupStderr } = await $(execaOptions)`${kuboBin} daemon`
const daemon = execa(kuboBin, ['daemon', '--offline'], execaOptions)

if (daemon == null || (daemon.stdout == null || daemon.stderr == null)) {
  throw new Error('failed to start kubo daemon')
}
daemon.stdout.pipe(process.stdout)
daemon.stderr.pipe(process.stderr)

// check for "daemon is ready" message
await new Promise((resolve, reject) => {
  daemon.stdout?.on('data', (data) => {
    if (data.includes('Daemon is ready')) {
      // @ts-expect-error - nothing needed here.
      resolve()
      console.log('Kubo daemon is ready')
    }
  })
  const timeout = setTimeout(() => {
    reject(new Error('kubo daemon failed to start'))
    clearTimeout(timeout)
  }, 5000)
})

// process.env.TARGET_HOST = `${cid.trim()}.ipfs.localhost:${gatewayPort}`
// process.env.TARGET_HOST = '127.0.0.1'
process.env.TARGET_HOST = 'localhost'
process.env.BACKEND_PORT = gatewayPort.toString()
process.env.PROXY_PORT = '3334'
// process.env.PREFIX_PATH = `/ipfs/${cid.trim()}`
process.env.SUBDOMAIN = `${cid.trim()}.ipfs`
process.env.DISABLE_TRY_FILES = 'true'
process.env.X_FORWARDED_HOST = 'localhost:3334'
const reverseProxy = execa('node', [`${join(__dirname, 'reverse-proxy.js')}`], execaOptions)
reverseProxy.stdout?.pipe(process.stdout)
// start reverse-proxy.js to forward requests to kubo
// const { stdout: proxyStdout, stderr: proxyStderr } = await $(execaOptions)`node ${join(__dirname, 'reverse-proxy.js')}`

// console.log(proxyStdout, proxyStderr)
