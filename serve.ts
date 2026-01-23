#!/usr/bin/env node

/**
 * This script is used to start everything needed to run the service worker
 * gateway like a complete IPFS gateway.
 *
 * It will start a kubo node, an ipfs gateway, and a reverse proxy for the
 * front-end assets.
 *
 * This file expects that `build:tsc` was ran first, and this will be handled
 * for you if ran via `npm run start`.
 */
import { existsSync, createReadStream } from 'node:fs'
import { createServer, Server } from 'node:http'
import { join, extname } from 'node:path'
import { pathToFileURL } from 'node:url'
import { execa } from 'execa'
import { createKuboNode } from './test-e2e/fixtures/create-kubo-node.ts'
import { loadIpnsRecords } from './test-e2e/fixtures/load-ipns-records.ts'
import { downloadFixtures, getIpfsNsMap, loadCarFixtures } from './test-e2e/fixtures/load-kubo-fixtures.ts'
import { setupIpfsGateway } from './test-e2e/ipfs-gateway.ts'
import type { KuboNode } from 'ipfsd-ctl'

// if user passes "--load-fixtures" flag, load all the fixtures
const args = process.argv.slice(2)

async function loadFixtures (): Promise<{
  controller: KuboNode
}> {
  await downloadFixtures()
  const IPFS_NS_MAP = await getIpfsNsMap()

  const controller = await createKuboNode(IPFS_NS_MAP)
  await controller.start()

  await loadCarFixtures(controller)
  await loadIpnsRecords(controller)

  return {
    controller
  }
}

const MIME_TYPES: Record<string, string> = {
  '.js': 'text/javascript; charset=utf8',
  '.png': 'image/png',
  '.map': 'text/plain',
  '.css': 'text/css; charset=utf8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf8',
  '.html': 'text/html; charset=utf8'
}

/**
 * create a web server that serves an asset if it exists or index.html if not,
 * this simulates the behaviour of Cloudflare with `./dist/_redirects`
 */
function createFrontend (): Server {
  return createServer((req, res) => {
    let file = req.url

    if (file == null || file === '/') {
      file = 'index.html'
    }

    let asset = join('./dist', file)

    if (!existsSync(asset)) {
      // serve index.html instead of 404ing
      asset = './dist/index.html'
    }

    res.statusCode = 200
    res.setHeader('content-type', MIME_TYPES[extname(asset)] ?? 'application/octet-stream')
    createReadStream(asset).pipe(res)
  })
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
  } else {
    controller = await createKuboNode()
  }

  // sets up kubo node and ipfs gateway
  const ipfsGateway = await setupIpfsGateway()
  /*
  // sets up reverse proxy for front-end assets being auto-loaded
  const reverseProxy = createReverseProxy({
    backendPort: shouldStartFrontend ? 8345 : 3000, // front-end server port. 3000 if playwright is running, 8345 if build.js starts the server
    proxyPort: 3333
  })
*/
  // rebuild the app on changes
  const build = shouldStartFrontend ? execa('node', ['build.js', '--watch']) : undefined
  build?.stdout?.pipe(process.stdout)
  build?.stderr?.pipe(process.stderr)

  // serve the dist folder similarly to how cloudflare does
  const frontend = createFrontend()
  frontend.listen(3333)

  const cleanup = async (): Promise<void> => {
    build?.kill()
    // reverseProxy.close()
    await ipfsGateway.stop()
    frontend.close()
    frontend.closeAllConnections()
  }

  // when the process exits, stop the reverse proxy
  build?.on('exit', () => { void cleanup() })
  process.on('SIGINT', () => { void cleanup() })
  process.on('SIGTERM', () => { void cleanup() })

  return {
    controller
  }
}

// Run main function if this file is being executed directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const {
    controller
  } = await serve({ shouldLoadFixtures: args.includes('--load-fixtures'), shouldStartFrontend: true })

  const info = await controller.info()

  // eslint-disable-next-line no-console
  console.info('Kubo gateway:', info.gateway)
  // eslint-disable-next-line no-console
  console.info('Kubo RPC API:', info.api)
}
