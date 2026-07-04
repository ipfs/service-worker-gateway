import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { withBitswap } from '@helia/bitswap'
import { delegatedRoutingV1HttpApiClientContentRouting, delegatedRoutingV1HttpApiClientPeerRouting } from '@helia/delegated-routing-v1-http-api-client'
import { withHTTP } from '@helia/http'
import { withLibp2p } from '@helia/libp2p'
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
import { createLibp2p } from 'libp2p'
import * as libp2pInfo from 'libp2p/version'
import * as json from 'multiformats/codecs/json'
import { sha1 } from 'multiformats/hashes/sha1'
import { sha512 } from 'multiformats/hashes/sha2'
import { config } from '../../config/index.ts'
import { collectingLogger } from '../../lib/collecting-logger.ts'
import { blake3 } from './blake3.ts'
import type { VerifiedFetch } from '@helia/verified-fetch'
import type { Libp2pOptions } from 'libp2p'

async function libp2pDefaults (): Promise<Libp2pOptions> {
  const agentVersion = `@helia/verified-fetch ${libp2pInfo.name}/${libp2pInfo.version} UserAgent=${globalThis.navigator.userAgent}`

  const filterAddrs = [
    'wss',  // /dns4/sv15.bootstrap.libp2p.io/tcp/443/wss/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJ
    'tls',  // /ip4/A.B.C.D/tcp/4002/tls/sni/A-B-C-D.peerid.libp2p.direct/ws/p2p/peerid
    'https' // /dns/example.com/tcp/443/https
  ] as string[]
  const transports: Array<(components: any) => any> = [
    webSockets()
  ]

  // Enable WebTransport when the browser exposes the API.
  // Baseline as of 2026-03 (Safari 26.4); also Chrome 97+, Edge 98+, Firefox 114+.
  if ('WebTransport' in globalThis) {
    transports.push(webTransport())
    filterAddrs.push('webtransport')
  }

  const services: Record<string, any> = {
    dcutr: dcutr(),
    identify: identify(),
    identifyPush: identifyPush(),
    keychain: keychain(),
    ping: ping()
  }

  config.routers.forEach((url, i) => {
    services[`delegatedContentRouter${i}`] = delegatedRoutingV1HttpApiClientContentRouting({
      url,
      filterProtocols: ['unknown', 'transport-bitswap', 'transport-ipfs-gateway-http'],
      filterAddrs
    })
    services[`delegatedPeerRouter${i}`] = delegatedRoutingV1HttpApiClientPeerRouting({
      url,
      filterProtocols: ['unknown', 'transport-bitswap', 'transport-ipfs-gateway-http'],
      filterAddrs
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

let verifiedFetch: VerifiedFetch

export async function updateVerifiedFetch (): Promise<void> {
  const logger = collectingLogger()

  const resolvers: Record<string, any> = {}

  for (const [key, resolver] of Object.entries(config.dnsResolvers)) {
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

  const libp2pOptions = await libp2pDefaults()
  libp2pOptions.dns = dnsConfig
  libp2pOptions.logger = logger
  libp2pOptions.datastore = datastore

  const libp2p = await createLibp2p(libp2pOptions)

  const helia = await withBitswap(withLibp2p(withHTTP(createHeliaLight({
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
    delegatedRouters: config.routers,
    recursiveGateways: config.gateways,
    allowLocal: true,
    allowInsecure: true
  }), libp2p)).start()

  verifiedFetch = await createVerifiedFetchWithHelia(helia, {
    withServerTiming: true
  })
  await verifiedFetch.start()
}

export async function getVerifiedFetch (): Promise<VerifiedFetch> {
  if (verifiedFetch == null) {
    await updateVerifiedFetch()
  }

  return verifiedFetch
}
