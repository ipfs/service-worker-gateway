#!/usr/bin/env node

/**
 * This script is used to start everything needed to run the service worker gateway like a complete IPFS gateway.
 * It will start a kubo node, an ipfs gateway, and a reverse proxy for the front-end assets.
 *
 * This file expects that `build:tsc` was ran first, and this will be handled for you if ran via `npm run start`
 */
import { pathToFileURL } from 'node:url'
import { logger } from '@libp2p/logger'
import { execa } from 'execa'
import { createKuboNode } from './test-e2e/fixtures/create-kubo-node.js'
import { loadIpnsRecords } from './test-e2e/fixtures/load-ipns-records.js'
import { downloadFixtures, getIpfsNsMap, loadCarFixtures } from './test-e2e/fixtures/load-kubo-fixtures.js'
import { setupIpfsGateway } from './test-e2e/ipfs-gateway.js'
import { createReverseProxy } from './test-e2e/reverse-proxy.js'
import type { KuboNode } from 'ipfsd-ctl'

const log = logger('serve')

// if user passes "--load-fixtures" flag, load all the fixtures
const args = process.argv.slice(2)

async function loadFixtures (): Promise<{
  controller: KuboNode
}> {
  await downloadFixtures()
  const IPFS_NS_MAP = await getIpfsNsMap()

  const controller = await createKuboNode(IPFS_NS_MAP)
  await controller.start()

  await loadCarFixtures()
  // eslint-disable-next-line no-console
  console.log('loading ipns records')
  try {
    await loadIpnsRecords(controller, log)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('error loading ipns records', err)
  }
  // eslint-disable-next-line no-console
  console.log('loaded ipns records')
  return {
    controller
  }
}

export interface ServeOptions {
  shouldLoadFixtures?: boolean
  shouldStartFrontend?: boolean
}

/**
 * start the service worker gateway, with reverse proxy, ipfs gateway, and front-end server
 */
export async function serve ({ shouldLoadFixtures = false, shouldStartFrontend = true }: ServeOptions = {}): Promise<{
  controller: KuboNode
}> {
  let controller: KuboNode
  if (shouldLoadFixtures) {
    const fixtures = await loadFixtures()
    controller = fixtures.controller
    // IPFS_NS_MAP = fixtures.IPFS_NS_MAP
  } else {
    controller = await createKuboNode()
  }

  // sets up kubo node and ipfs gateway
  const ipfsGateway = await setupIpfsGateway()

  // sets up reverse proxy for front-end assets being auto-loaded
  const reverseProxy = createReverseProxy({
    backendPort: shouldStartFrontend ? 8345 : 3000, // front-end server port. 3000 if playwright is running, 8345 if build.js starts the server
    proxyPort: 3333
  })

  // call build.js with --serve and --watch flags, piping the output to the console
  const frontend = shouldStartFrontend ? execa('node', ['build.js', '--serve', '--watch']) : undefined

  frontend?.stdout?.pipe(process.stdout)
  frontend?.stderr?.pipe(process.stderr)

  const cleanup = async (): Promise<void> => {
    frontend?.kill()
    reverseProxy.close()
    await ipfsGateway.stop()
  }

  // when the process exits, stop the reverse proxy
  void frontend?.on('exit', () => { void cleanup() })
  void process.on('SIGINT', () => { void cleanup() })
  void process.on('SIGTERM', () => { void cleanup() })

  return {
    controller
  }
}

// Run main function if this file is being executed directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await serve({ shouldLoadFixtures: args.includes('--load-fixtures'), shouldStartFrontend: true })
}
