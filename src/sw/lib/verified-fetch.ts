import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { trustlessGateway, bitswap } from '@helia/block-brokers'
import { delegatedRoutingV1HttpApiClient } from '@helia/delegated-routing-v1-http-api-client'
import { createHeliaHTTP } from '@helia/http'
import { httpGatewayRouting, delegatedHTTPRouting, libp2pRouting } from '@helia/routers'
import { createVerifiedFetch } from '@helia/verified-fetch'
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
import { createHelia } from 'helia'
import { createLibp2p } from 'libp2p'
import * as libp2pInfo from 'libp2p/version'
import { sha1 } from 'multiformats/hashes/sha1'
import { collectingLogger } from '../../lib/collecting-logger.js'
import { getSwLogger } from '../../lib/logger.js'
import { blake3 } from './blake3.js'
import { getConfig, updateConfig } from './config.js'
import type { ConfigDb } from '../../lib/config-db.js'
import type { DelegatedRoutingV1HttpApiClient } from '@helia/delegated-routing-v1-http-api-client'
import type { BlockBroker } from '@helia/interface'
import type { VerifiedFetch } from '@helia/verified-fetch'
import type { DNSResolvers } from '@multiformats/dns'
import type { Helia, Routing } from 'helia'
import type { Libp2pOptions } from 'libp2p'

type Libp2pDefaultsOptions = Pick<ConfigDb, 'routers' | 'enableWss' | 'enableWebTransport' | 'enableGatewayProviders'>

async function libp2pDefaults (config: Libp2pDefaultsOptions): Promise<Libp2pOptions> {
  const agentVersion = `@helia/verified-fetch ${libp2pInfo.name}/${libp2pInfo.version} UserAgent=${globalThis.navigator.userAgent}`
  const privateKey = await generateKeyPair('Ed25519')

  const filterAddrs = [] as string[]
  const transports: Array<(components: any) => any> = []

  if (config.enableWss) {
    transports.push(webSockets())
    filterAddrs.push('wss') // /dns4/sv15.bootstrap.libp2p.io/tcp/443/wss/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJ
    filterAddrs.push('tls') // /ip4/A.B.C.D/tcp/4002/tls/sni/A-B-C-D.peerid.libp2p.direct/ws/p2p/peerid
  }
  if (config.enableWebTransport) {
    transports.push(webTransport())
    filterAddrs.push('webtransport')
  }
  if (config.enableGatewayProviders) {
    filterAddrs.push('https') // /dns/example.com/tcp/443/https
    filterAddrs.push('tls') // /ip4/A.B.C.D/tcp/4002/tls/sni/example.com/http
  }

  interface Libp2pOptionsWithDelegatedRouting extends Libp2pOptions {
    services: Libp2pOptions['services'] & Record<`delegatedRouter${number}`, (components: any) => DelegatedRoutingV1HttpApiClient>
  }
  const libp2pOptions: Libp2pOptionsWithDelegatedRouting = {
    privateKey,
    nodeInfo: {
      userAgent: agentVersion
    },
    addresses: {}, // no need to listen on any addresses
    transports,
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    services: {
      dcutr: dcutr(),
      identify: identify(),
      identifyPush: identifyPush(),
      keychain: keychain(),
      ping: ping()
    }
  } satisfies Libp2pOptionsWithDelegatedRouting

  // Add delegated routing services for each passed delegated router endpoint
  config.routers.forEach((router, i) => {
    libp2pOptions.services[`delegatedRouter${i}`] = delegatedRoutingV1HttpApiClient({
      url: router,
      filterProtocols: ['unknown', 'transport-bitswap', 'transport-ipfs-gateway-http'],
      filterAddrs
    })
  })

  return libp2pOptions
}

let verifiedFetch: VerifiedFetch

export async function updateVerifiedFetch (): Promise<void> {
  await updateConfig()
  const config = await getConfig()

  const log = getSwLogger('update-verified-fetch')
  log('got config for sw location %s %o', self.location.origin, config)

  // Start by adding the config routers as delegated routers
  const routers: Array<Partial<Routing> | ((components: any) => Partial<Routing>)> = []

  if (config.enableRecursiveGateways) {
    // Only add the gateways if the recursive gateways toggle is enabled
    routers.push(httpGatewayRouting({ gateways: config.gateways }))
  }

  // set dns resolver instances
  const dnsResolvers: DNSResolvers = {}
  for (const [key, value] of Object.entries(config.dnsJsonResolvers)) {
    dnsResolvers[key] = dnsJsonOverHttps(value)
  }
  const dnsConfig = dns({ resolvers: dnsResolvers })

  const blockBrokers: Array<(components: any) => BlockBroker> = []

  if (config.enableGatewayProviders) {
    blockBrokers.push(trustlessGateway({ allowLocal: true }))
  }

  const hashers = [blake3, blake2b256, sha1]

  let helia: Helia
  if (config.enableWss || config.enableWebTransport) {
    // If we are using websocket or webtransport, we need to instantiate libp2p
    blockBrokers.push(bitswap())
    const libp2pOptions = await libp2pDefaults(config)
    libp2pOptions.dns = dnsConfig
    libp2pOptions.logger = collectingLogger()
    const libp2p = await createLibp2p(libp2pOptions)
    routers.push(libp2pRouting(libp2p))

    helia = await createHelia({
      logger: collectingLogger(),
      libp2p,
      routers,
      blockBrokers,
      hashers,
      dns: dnsConfig
    })
  } else {
    config.routers.forEach((router) => {
      routers.push(delegatedHTTPRouting({
        url: router,
        // NOTE: in practice 'transport-ipfs-gateway-http' exists only in IPNI
        // results, we won't have any DHT results like this unless..
        // TODO: someguy starts doing active probing (https://github.com/ipfs/someguy/issues/53)
        // to identify peers which have functional HTTP gateway
        filterProtocols: ['transport-ipfs-gateway-http'],
        // Include both /https && /tls/../http
        filterAddrs: ['https', 'tls']
      }))
    })

    helia = await createHeliaHTTP({
      routers,
      blockBrokers,
      hashers,
      dns: dnsConfig
    })
  }

  verifiedFetch = await createVerifiedFetch(helia, {
    withServerTiming: true
  })
}

export async function getVerifiedFetch (): Promise<VerifiedFetch> {
  if (verifiedFetch == null) {
    await updateVerifiedFetch()
  }

  return verifiedFetch
}
