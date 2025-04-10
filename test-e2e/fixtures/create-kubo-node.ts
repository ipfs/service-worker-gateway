import { mkdir, readFile, writeFile, cp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { cwd } from 'node:process'
import { fileURLToPath } from 'node:url'
import { logger } from '@libp2p/logger'
import { $ } from 'execa'
import { createNode, type KuboNode } from 'ipfsd-ctl'
import { path as kuboPath, path } from 'kubo'
import { create } from 'kubo-rpc-client'
import { kuboRepoDir as IPFS_PATH } from './load-kubo-fixtures.js'

const kuboBin = path()
const log = logger('ipfs-host.local:kubo')
// eslint-disable-next-line @typescript-eslint/naming-convention
const __dirname = dirname(fileURLToPath(import.meta.url))

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

export const gatewayPort = Number(process.env.GATEWAY_PORT ?? 8088)

export const kuboDistPath = join(tmpdir(), 'dist')

let kuboDistCid: string | undefined

export async function getKuboDistCid (): Promise<string> {
  if (kuboDistCid != null) {
    return kuboDistCid
  }
  // copy the dist folder to a temporary directory and then replace the _redirects file with the kubo_redirects file
  await mkdir(kuboDistPath, { recursive: true })
  await cp(join(cwd(), './dist'), kuboDistPath, { recursive: true })

  const kuboRedirects = await readFile(join(kuboDistPath, '_kubo_redirects'), 'utf-8')

  await writeFile(join(kuboDistPath, '_redirects'), kuboRedirects)

  await mkdir(IPFS_PATH, { recursive: true })
  try {
    await $(execaOptions)`${kuboBin} init`
  } catch (error) {
    log('error: ', error)
  }
  const { stdout: cid } = await $(execaOptions)`${kuboBin} add -r -Q ${kuboDistPath} --cid-version 1`

  log('sw-gateway dist CID: ', cid.trim())

  return cid.trim()
}

export async function createKuboNode (): Promise<KuboNode> {
  // eslint-disable-next-line no-console
  log('process.env.GATEWAY_PORT', process.env.GATEWAY_PORT)
  const cid = await getKuboDistCid()

  const { stdout: pinStdout } = await $(execaOptions)`${kuboBin} pin add -r /ipfs/${cid.trim()}`

  // we need to set this because ipfsd-ctl doesn't currently.. see https://github.com/ipfs/js-ipfsd-ctl/pull/857
  await $(execaOptions)`${kuboBin} config Addresses.Gateway /ip4/127.0.0.1/tcp/${gatewayPort}`
  log('pinStdout: ', pinStdout)

  log('config.Addresses.Gateway: ', JSON.parse(await readFile(join(IPFS_PATH, 'config'), 'utf-8')).Addresses.Gateway)

  const IPFS_NS_MAP = [['ipfs-host.local', `/ipfs/${cid.trim()}`]].map(([host, path]) => `${host}:${path}`).join(',')
  const gatewayAddress = `/ip4/127.0.0.1/tcp/${gatewayPort}`
  log('gatewayAddress: ', gatewayAddress)
  const node = await createNode({
    type: 'kubo',
    bin: kuboPath(),
    rpc: create,
    test: false,
    disposable: false,
    repo: IPFS_PATH,
    env: {
      // ...execaOptions.env,
      IPFS_NS_MAP
    },
    start: {
      args: ['--offline']
    },
    init: {
      // emptyRepo: false,
      config: {
        Addresses: {
          Gateway: gatewayAddress,
          API: '/ip4/127.0.0.1/tcp/0'
        },
        Bootstrap: [],
        Swarm: {
          DisableNatPortMap: true
        },
        Discovery: {
          MDNS: {
            Enabled: false
          }
        },
        Gateway: {
          NoFetch: true,
          DeserializedResponses: true,
          ExposeRoutingAPI: false,
          HTTPHeaders: {
            'Access-Control-Allow-Origin': ['*'],
            'Access-Control-Allow-Methods': ['GET', 'POST', 'PUT', 'OPTIONS']
          }
        }
      }
    },
    args: []
  })

  // log the gateway info
  const info = await node.info()
  log('node info %O', info)

  // log contents of info.repo/config
  const config = await readFile(join(info.repo, 'config'), 'utf-8')
  log('config.Addresses.Gateway: ', JSON.parse(config).Addresses.Gateway)

  return node
}
