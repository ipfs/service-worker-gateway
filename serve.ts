#!/usr/bin/env node

/* eslint-disable no-console */

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
import { parseArgs } from 'node:util'
import * as dagCbor from '@ipld/dag-cbor'
import { execa } from 'execa'
import { createKuboRPCClient } from 'kubo-rpc-client'
import { startServers } from './test-e2e/fixtures/serve/index.ts'
import type { ResultPromise } from 'execa'
import type { Server } from 'node:http'

function toBoolean (val?: string | boolean, def: boolean = false): boolean {
  if (val == null) {
    return def
  }

  if (val === true || val === false) {
    return val
  }

  return val === 'true'
}

const args = parseArgs({
  args: process.argv,
  strict: false,
  options: {
    'load-fixtures': {
      type: 'boolean',
      default: false
    },
    'start-frontend': {
      type: 'boolean',
      default: true
    },
    watch: {
      type: 'boolean',
      default: false
    }
  }
})

const servers = await startServers({
  loadFixtures: toBoolean(args.values['load-fixtures'], false),
  startFrontend: toBoolean(args.values['start-frontend'], true),
  startSecondaryGateway: true
})

const info = await servers.kubo.info()

console.info('Kubo gateway:', info.gateway)
console.info('Kubo RPC API:', info.api)

if (servers.serviceWorker != null) {
  console.info('HTTP server:', `http://localhost:${getPort(servers.serviceWorker)}`)
}

const gateway = await servers.gateway?.info()

if (gateway != null) {
  console.info('Secondary Kubo gateway:', gateway.gateway)
  console.info('Secondary Kubo RPC API:', gateway.api)

  const gatewayApi = createKuboRPCClient(gateway.api)

  const block = dagCbor.encode({
    hello: 'world'
  })
  const cid = await gatewayApi.block.put(block, {
    format: 'dag-cbor'
  })

  console.info('Secondary Kubo gateway CID', cid.toString())
}

let build: ResultPromise | undefined

if (toBoolean(args.values.watch, false)) {
  // rebuild the app on changes
  build = execa('node', ['build.js', '--watch'])
  build?.stdout?.pipe(process.stdout)
  build?.stderr?.pipe(process.stderr)
}

const cleanup = async (): Promise<void> => {
  build?.kill()
  await servers.stop?.()
}

// when the process exits, stop the reverse proxy
build?.on('exit', () => { void cleanup() })
process.on('SIGINT', () => { void cleanup() })
process.on('SIGTERM', () => { void cleanup() })

function getPort (server?: Server): number {
  const address = server?.address()

  if (address == null || typeof address === 'string') {
    throw new Error('Server was not listening')
  }

  return address.port
}
