import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { withBitswap } from '@helia/bitswap'
import { delegatedRoutingV1HttpApiClientContentRouting, delegatedRoutingV1HttpApiClientPeerRouting } from '@helia/delegated-routing-v1-http-api-client'
import { withHTTP } from '@helia/http'
import { withLibp2pLight } from '@helia/libp2p'
import { createVerifiedFetchWithHelia } from '@helia/verified-fetch'
import * as dagCbor from '@ipld/dag-cbor'
import * as dagJson from '@ipld/dag-json'
import { dcutr } from '@libp2p/dcutr'
import { identify, identifyPush } from '@libp2p/identify'
import { keychain } from '@libp2p/keychain'
import { ping } from '@libp2p/ping'
import { webSockets } from '@libp2p/websockets'
import { webTransport } from '@libp2p/webtransport'
import { blake2b256 } from '@multiformats/blake2/blake2b'
import { dns } from '@multiformats/dns'
import { dnsJsonOverHttps } from '@multiformats/dns/resolvers'
import { IDBBlockstore } from 'blockstore-idb'
import { IDBDatastore } from 'datastore-idb'
import { createHeliaLight } from 'helia'
import * as libp2pInfo from 'libp2p/version'
import * as json from 'multiformats/codecs/json'
import { sha1 } from 'multiformats/hashes/sha1'
import { sha512 } from 'multiformats/hashes/sha2'
import { collectingLogger } from '../../lib/collecting-logger.ts'
import { blake3 } from './blake3.ts'
import type { ResolvedConfig } from './runtime-config.ts'
import type { VerifiedFetch } from '@helia/verified-fetch'
import type { Libp2pOptions } from 'libp2p'

async function libp2pDefaults (routers: string[]): Promise<Libp2pOptions> {
  const agentVersion = `@helia/verified-fetch ${libp2pInfo.name}/${libp2pInfo.version} UserAgent=${globalThis.navigator.userAgent}`
  const transports: Array<(components: any) => any> = [
    webSockets()
  ]

  // Enable WebTransport when the browser exposes the API.
  // Baseline as of 2026-03 (Safari 26.4); also Chrome 97+, Edge 98+, Firefox 114+.
  if ('WebTransport' in globalThis) {
    transports.push(webTransport())
  }

  const services: Record<string, any> = {
    dcutr: dcutr(),
    identify: identify(),
    identifyPush: identifyPush(),
    keychain: keychain(),
    ping: ping()
  }

  routers.forEach((url, i) => {
    services[`delegatedContentRouter${i}`] = delegatedRoutingV1HttpApiClientContentRouting({
      url
    })
    services[`delegatedPeerRouter${i}`] = delegatedRoutingV1HttpApiClientPeerRouting({
      url
    })
  })

  return {
    nodeInfo: {
      userAgent: agentVersion
    },
    addresses: {}, // no need to listen on any addresses
    transports,
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    services
  }
}

/**
 * Cache of `verifiedFetch` instances keyed by `ResolvedConfig.hash`, so each
 * distinct backend set gets its own Helia without rebuilding on every request.
 * Bounded by a small LRU to cap memory (each instance holds an IDB
 * blockstore/datastore + libp2p node).
 */
const MAX_VERIFIED_FETCH_INSTANCES = 3
const verifiedFetchCache = new Map<string, VerifiedFetch>()

/**
 * Build a `verifiedFetch` instance for the given resolved config. Called on a
 * cache miss from `getVerifiedFetch`.
 */
async function buildVerifiedFetch (resolved: ResolvedConfig): Promise<VerifiedFetch> {
  const logger = collectingLogger()

  const resolvers: Record<string, any> = {}

  for (const [key, resolver] of Object.entries(resolved.dnsResolvers)) {
    resolvers[key] = Array.isArray(resolver) ? resolver.map(r => dnsJsonOverHttps(r)) : dnsJsonOverHttps(resolver)
  }

  const dnsConfig = dns({
    resolvers,
    logger
  })

  const datastore = new IDBDatastore('/@helia/service-worker-gateway/data')
  await datastore.open()
  const blockstore = new IDBBlockstore('/@helia/service-worker-gateway/blocks')
  await blockstore.open()

  const libp2pOptions = await libp2pDefaults(resolved.routers)
  libp2pOptions.dns = dnsConfig
  libp2pOptions.logger = logger
  libp2pOptions.datastore = datastore

  const helia = await withBitswap(withLibp2pLight(withHTTP(createHeliaLight({
    datastore,
    blockstore,
    logger,
    dns: dnsConfig,
    hashers: [
      blake3,
      blake2b256,
      sha1,
      sha512
    ],
    codecs: [
      dagCbor,
      dagJson,
      json
    ]
  }), {
    delegatedRouters: resolved.routers,
    recursiveGateways: resolved.gateways,
    allowLocal: true,
    allowInsecure: true
  }), libp2pOptions)).start()

  const vf = await createVerifiedFetchWithHelia(helia, {
    withServerTiming: true
  })
  await vf.start()

  return vf
}

/**
 * Get the `verifiedFetch` instance for the given resolved config, building it
 * on a cache miss. Instances are cached by `resolved.hash` and evicted in LRU
 * order once `MAX_VERIFIED_FETCH_INSTANCES` is exceeded.
 */
export async function getVerifiedFetch (resolved: ResolvedConfig): Promise<VerifiedFetch> {
  const existing = verifiedFetchCache.get(resolved.hash)
  if (existing != null) {
    // Move to end (most-recently-used) by re-inserting.
    verifiedFetchCache.delete(resolved.hash)
    verifiedFetchCache.set(resolved.hash, existing)
    return existing
  }

  const vf = await buildVerifiedFetch(resolved)

  verifiedFetchCache.set(resolved.hash, vf)
  while (verifiedFetchCache.size > MAX_VERIFIED_FETCH_INSTANCES) {
    // Evict the least-recently-used entry (first key in insertion order).
    const oldestKey = verifiedFetchCache.keys().next().value
    if (oldestKey == null) {
      break
    }
    const evicted = verifiedFetchCache.get(oldestKey)
    verifiedFetchCache.delete(oldestKey)
    // Best-effort teardown; `verifiedFetch` does not expose a synchronous stop
    // in all versions, so guard it.
    try {
      await evicted?.stop?.()
    } catch {
      // ignore — evicted instance will be GC'd
    }
  }

  return vf
}
