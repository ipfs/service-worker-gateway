/* eslint-disable no-console */
/**
 * This file is used to simulate hosting the dist folder on an ipfs gateway, so we can handle _redirects
 */
import { logger } from '@libp2p/logger'
import waitOn from 'wait-on'
import { gatewayPort, getKuboDistCid } from './fixtures/create-kubo-node.js'
import { createReverseProxy } from './reverse-proxy.js'

// to get logs for kubo node, you need to use 'ipfsd-ctl:kubo'
const proxyLog = logger('ipfs-gateway:proxy')
// const log = logger('ipfs-host.local')
// const daemonLog = logger('ipfs-host.local:kubo')
// // eslint-disable-next-line @typescript-eslint/naming-convention
// const __dirname = dirname(fileURLToPath(import.meta.url))
// const IPFS_PATH = kuboRepoDir
// const kuboBin = path()

// const gatewayPort = Number(process.env.GATEWAY_PORT ?? 8088)

// /**
//  * @type {import('execa').Options}
//  */
// const execaOptions = {
//   cwd: __dirname,
//   cleanup: true,
//   env: {
//     IPFS_PATH,
//     GOLOG_LOG_LEVEL: process.env.GOLOG_LOG_LEVEL ?? 'debug,*=debug',
//     DEBUG: 'reverse-proxy,reverse-proxy:*'
//   }
// }

// try {
//   await mkdir(IPFS_PATH, { recursive: true })
//   await $(execaOptions)`${kuboBin} init`
//   log('done with init')
// } catch (_) {
//   // ignore
// }
// log('using IPFS_PATH: ', IPFS_PATH)

// /**
//  * cloudflare redirects and Kubo gateway redirects are different, so we need to replace the dist/_redirects with dist/_kubo_redirects before adding to IPFS
//  */
// const kuboRedirects = await readFile(join(cwd(), './dist/_kubo_redirects'), 'utf-8')

// await writeFile(join(cwd(), './dist/_redirects'), kuboRedirects)
// const distPath = relative(cwd(), '../../dist')
// const { stdout: cid } = await $(execaOptions)`${kuboBin} add -r -Q ${distPath} --cid-version 1`

// log('sw-gateway dist CID: ', cid.trim())
// const { stdout: pinStdout } = await $(execaOptions)`${kuboBin} pin add -r /ipfs/${cid.trim()}`
// log('pinStdout: ', pinStdout)

// const IPFS_NS_MAP = [['ipfs-host.local', `/ipfs/${cid.trim()}`]].map(([host, path]) => `${host}:${path}`).join(',')

// // @ts-expect-error - it's defined.
// execaOptions.env.IPFS_NS_MAP = IPFS_NS_MAP

// // await $(execaOptions)`${kuboBin} config Addresses.Gateway /ip4/127.0.0.1/tcp/${gatewayPort}`
// // await $(execaOptions)`${kuboBin} config Addresses.API /ip4/127.0.0.1/tcp/0`
// // await $(execaOptions)`${kuboBin} config --json Bootstrap ${JSON.stringify([])}`
// // await $(execaOptions)`${kuboBin} config --json Swarm.DisableNatPortMap true`
// // await $(execaOptions)`${kuboBin} config --json Discovery.MDNS.Enabled false`
// // await $(execaOptions)`${kuboBin} config --json Gateway.NoFetch true`
// // await $(execaOptions)`${kuboBin} config --json Gateway.DeserializedResponses true`
// // await $(execaOptions)`${kuboBin} config --json Gateway.ExposeRoutingAPI false`
// // await $(execaOptions)`${kuboBin} config --json Gateway.HTTPHeaders.Access-Control-Allow-Origin ${JSON.stringify(['*'])}`
// // await $(execaOptions)`${kuboBin} config --json Gateway.HTTPHeaders.Access-Control-Allow-Methods  ${JSON.stringify(['GET', 'POST', 'PUT', 'OPTIONS'])}`

// // // log('starting kubo')
// // // // need to stand up kubo daemon to serve the dist folder
// // // const daemon = execa(kuboBin, ['daemon', '--offline'], execaOptions)

// // // if (daemon.stdout == null || daemon.stderr == null) {
// // //   throw new Error('failed to start kubo daemon')
// // // }
// // // daemon.stdout.on('data', (data) => {
// // //   daemonLog(data.toString())
// // // })
// // // daemon.stderr.on('data', (data) => {
// // //   daemonLog.trace(data.toString())
// // // })

// // // // check for "daemon is ready" message
// // // await new Promise((resolve, reject) => {
// // //   daemon.stdout?.on('data', (data: string) => {
// // //     if (data.includes('Daemon is ready')) {
// // //       // @ts-expect-error - nothing needed here.
// // //       resolve()
// // //       log('Kubo daemon is ready')
// // //     }
// // //   })
// // //   const timeout = setTimeout(() => {
// // //     reject(new Error('kubo daemon failed to start'))
// // //     clearTimeout(timeout)
// // //   }, 5000)
// // // })

/**
 * If the kubo node was not started (e.g. in playwright's global-setup.ts)
 * we need to start it here.
 *
 * We will check if the port at gatewayPort is open, if not we will start the kubo node.
 */
// await fetch(`http://localhost:${gatewayPort}`).catch(async (err) => {
//   if (err.code === 'ECONNREFUSED') {
//     throw new Error('Kubo node is not running')
//   }
//   throw err
// })

export async function setupIpfsGateway (): Promise<void> {
  await waitOn({
    resources: [`tcp:${gatewayPort}`],
    interval: 1000,
    timeout: 10000
  })

  const cid = await getKuboDistCid()

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
}
