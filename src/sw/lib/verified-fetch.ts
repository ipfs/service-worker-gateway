import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { trustlessGateway, bitswap } from '@helia/block-brokers'
import { delegatedRoutingV1HttpApiClient } from '@helia/delegated-routing-v1-http-api-client'
import { httpGatewayRouting, libp2pRouting } from '@helia/routers'
import { Helia } from '@helia/utils'
import { createVerifiedFetchWithHelia } from '@helia/verified-fetch'
import { generateKeyPair } from '@libp2p/crypto/keys'
import { dcutr } from '@libp2p/dcutr'
import { identify, identifyPush } from '@libp2p/identify'
import { keychain } from '@libp2p/keychain'
import { ping } from '@libp2p/ping'
import { webSockets } from '@libp2p/websockets'
import { webTransport } from '@libp2p/webtransport'
import { blake2b256 } from '@multiformats/blake2/blake2b'
import { dns } from '@multiformats/dns'
import { dnsJsonOverHttps } from '@multiformats/dns/resolvers'
import { MemoryBlockstore } from 'blockstore-core'
import { MemoryDatastore } from 'datastore-core'
import { createLibp2p } from 'libp2p'
import * as libp2pInfo from 'libp2p/version'
import { sha1 } from 'multiformats/hashes/sha1'
import { config } from '../../config/index.ts'
import { collectingLogger } from '../../lib/collecting-logger.ts'
import { blake3 } from './blake3.ts'
import type { VerifiedFetch } from '@helia/verified-fetch'
import type { Libp2pOptions } from 'libp2p'

async function libp2pDefaults (): Promise<Libp2pOptions> {
  const agentVersion = `@helia/verified-fetch ${libp2pInfo.name}/${libp2pInfo.version} UserAgent=${globalThis.navigator.userAgent}`
  const privateKey = await generateKeyPair('Ed25519')

  const filterAddrs = [
    'wss',  // /dns4/sv15.bootstrap.libp2p.io/tcp/443/wss/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJ
    'tls',  // /ip4/A.B.C.D/tcp/4002/tls/sni/A-B-C-D.peerid.libp2p.direct/ws/p2p/peerid
    'https' // /dns/example.com/tcp/443/https
  ] as string[]
  const transports: Array<(components: any) => any> = [
    webSockets()
  ]

  // WebTransport only works reliably in Firefox at the time of writing
  if (navigator?.userAgent?.toLowerCase().includes('firefox') === true) {
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
    services[`delegatedRouter${i}`] = delegatedRoutingV1HttpApiClient({
      url,
      filterProtocols: ['unknown', 'transport-bitswap', 'transport-ipfs-gateway-http'],
      filterAddrs
    })
  })

  return {
    privateKey,
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

  const hashers = [blake3, blake2b256, sha1]
  const datastore = new MemoryDatastore()
  const blockstore = new MemoryBlockstore()

  const libp2pOptions = await libp2pDefaults()
  libp2pOptions.dns = dnsConfig
  libp2pOptions.logger = logger
  libp2pOptions.datastore = datastore

  const libp2p = await createLibp2p(libp2pOptions)

  const helia = new Helia({
    logger,
    libp2p,
    routers: [
      httpGatewayRouting({
        gateways: config.gateways
      }),
      libp2pRouting(libp2p)
    ],
    blockBrokers: [
      bitswap(),
      trustlessGateway({
        allowLocal: true
      })
    ],
    hashers,
    dns: dnsConfig,
    datastore,
    blockstore
  })

  verifiedFetch = await createVerifiedFetchWithHelia(helia, {
    withServerTiming: true
  })
}

export async function getVerifiedFetch (): Promise<VerifiedFetch> {
  if (verifiedFetch == null) {
    await updateVerifiedFetch()
  }

  return verifiedFetch
}
