#!/usr/bin/env node

/**
 * This script is used to start everything needed to run the service worker gateway like a complete IPFS gateway.
 * It will start a kubo node, an ipfs gateway, and a reverse proxy for the front-end assets.
 *
 * This file expects that `build:tsc` was ran first, and this will be handled for you if ran via `npm run start`
 */

import { execa } from 'execa'
import { setupIpfsGateway } from './dist-tsc/test-e2e/ipfs-gateway.js'
import { createReverseProxy } from './dist-tsc/test-e2e/reverse-proxy.js'

// start reverse proxy and basically do everything that global-setup.ts does, plus start the front-end server

// sets up kubo node and ipfs gateway
const ipfsGateway = await setupIpfsGateway()

// sets up reverse proxy for front-end assets being auto-loaded
const reverseProxy = createReverseProxy({
  backendPort: 3000, // from playwright webserver
  proxyPort: 3333
})

// call build.js with --serve and --watch flags, piping the output to the console
const frontend = execa('node', ['build.js', '--serve', '--watch'])

frontend.stdout.pipe(process.stdout)
frontend.stderr.pipe(process.stderr)

const cleanup = async () => {
  frontend.kill()
  await reverseProxy.close()
  await ipfsGateway.stop()
}

// when the process exits, stop the reverse proxy
frontend.on('exit', cleanup)
process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)
