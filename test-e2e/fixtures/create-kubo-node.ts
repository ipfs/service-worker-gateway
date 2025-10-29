import { mkdir, readFile, writeFile, cp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { cwd } from 'node:process'
import { fileURLToPath } from 'node:url'
import { logger } from '@libp2p/logger'
import { $ } from 'execa'
import { createNode } from 'ipfsd-ctl'
import { path as kuboPath, path } from 'kubo'
import { create } from 'kubo-rpc-client'
import { kuboRepoDir as IPFS_PATH } from './load-kubo-fixtures.js'
import type { KuboNode } from 'ipfsd-ctl'

const kuboBin = path()
const log = logger('ipfs-host.local:kubo')

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * @type {import('execa').Options}
 */
const execaOptions = {
  cwd: __dirname,
  cleanup: true,
  env: {
    IPFS_PATH,
    GOLOG_LOG_LEVEL: process.env.GOLOG_LOG_LEVEL ?? 'info,*=info',
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

  const uniqueIpfsPath = `${tmpdir()}/.ipfs/${Date.now()}_${Math.random()}`
  // init kubo in a completely different and unique directory so we can generate the CID for the dist folder
  const uniqueExecaOptions = { ...execaOptions, env: { ...execaOptions.env, IPFS_PATH: uniqueIpfsPath } }
  // copy the dist folder to a temporary directory and then replace the _redirects file with the kubo_redirects file
  await mkdir(kuboDistPath, { recursive: true })
  await cp(join(cwd(), './dist'), kuboDistPath, { recursive: true })

  const kuboRedirects = await readFile(join(kuboDistPath, '_kubo_redirects'), 'utf-8')

  await writeFile(join(kuboDistPath, '_redirects'), kuboRedirects)

  await mkdir(IPFS_PATH, { recursive: true })
  try {
    log('initializing kubo node at %s', uniqueIpfsPath)
    await $(uniqueExecaOptions)`${kuboBin} init`
  } catch (error) {
    log('error - %e', error)
  }
  const { stdout: cid } = await $(uniqueExecaOptions)`${kuboBin} add --only-hash -r -Q ${kuboDistPath} --cid-version 1`

  log('sw-gateway dist CID: ', cid.trim())

  return cid.trim()
}

export async function createKuboNode (IPFS_NS_MAP?: string): Promise<KuboNode> {
  const cidString1 = (await getKuboDistCid()).trim()
  const localNsMap = `ipfs-host.local:/ipfs/${cidString1}`
  if (IPFS_NS_MAP == null) {
    IPFS_NS_MAP = localNsMap
    log('using localNsMap for IPFS_NS_MAP: ', IPFS_NS_MAP)
  } else {
    IPFS_NS_MAP += `,${localNsMap}`
    log('using combined IPFS_NS_MAP: ', IPFS_NS_MAP)
  }

  const gatewayAddress = `/ip4/127.0.0.1/tcp/${gatewayPort}`
  log('IPFS_PATH for kubo node: ', IPFS_PATH)
  const node = await createNode({
    type: 'kubo',
    bin: kuboPath(),
    rpc: create,
    test: true,
    disposable: true,
    repo: IPFS_PATH,
    env: {
      IPFS_NS_MAP
    },
    start: {
      args: ['--offline']
    },
    init: {
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

  // now actually load the dist folder into our running kubo node
  const { stdout: cidString2 } = await $(execaOptions)`${kuboBin} add -r -Q ${kuboDistPath} --cid-version 1`

  if (cidString1 !== cidString2) {
    // if for some reason the CID generated in order to add to IPFS_NS_MAP is different from the CID generated for our running kubo node, throw an error
    throw new Error(`CID mismatch, ${cidString1} !== ${cidString2}`)
  }

  await $(execaOptions)`${kuboBin} pin add -r /ipfs/${cidString2}`

  // log the gateway info
  const info = await node.info()
  log('node info %O', info)

  return node
}
