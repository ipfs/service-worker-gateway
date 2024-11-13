import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { trustlessGateway, bitswap } from '@helia/block-brokers'
import { createDelegatedRoutingV1HttpApiClient } from '@helia/delegated-routing-v1-http-api-client'
import { createHeliaHTTP } from '@helia/http'
import { type BlockBroker } from '@helia/interface'
import { httpGatewayRouting, delegatedHTTPRouting, libp2pRouting } from '@helia/routers'
import { createVerifiedFetch, type VerifiedFetch } from '@helia/verified-fetch'
import { generateKeyPair } from '@libp2p/crypto/keys'
import { dcutr } from '@libp2p/dcutr'
import { identify, identifyPush } from '@libp2p/identify'
import { keychain } from '@libp2p/keychain'
import { ping } from '@libp2p/ping'
import { webSockets } from '@libp2p/websockets'
import { webTransport } from '@libp2p/webtransport'
import { dns, type DNSResolvers } from '@multiformats/dns'
import { dnsJsonOverHttps } from '@multiformats/dns/resolvers'
import { createHelia, type Helia, type Routing } from 'helia'
import { createLibp2p, type Libp2pOptions } from 'libp2p'
import * as libp2pInfo from 'libp2p/version'
import { blake3 } from './blake3.js'
import { contentTypeParser } from './content-type-parser.js'
import type { ConfigDb } from './config-db.js'
import type { ComponentLogger } from '@libp2p/logger'

export async function getVerifiedFetch (config: ConfigDb, logger: ComponentLogger): Promise<VerifiedFetch> {
  const log = logger.forComponent('get-verified-fetch')
  log(`config-debug: got config for sw location ${self.location.origin}`, JSON.stringify(config, null, 2))

  // Start by adding the config routers as delegated routers
  const routers: Array<Partial<Routing>> = []

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
    blockBrokers.push(trustlessGateway())
  }

  const hashers = [blake3]

  let helia: Helia
  if (config.enableWss || config.enableWebTransport) {
    // If we are using websocket or webtransport, we need to instantiate libp2p
    blockBrokers.push(bitswap())
    const libp2pOptions = await libp2pDefaults(config)
    libp2pOptions.dns = dnsConfig
    const libp2p = await createLibp2p(libp2pOptions)
    routers.push(libp2pRouting(libp2p))

    helia = await createHelia({
      libp2p,
      routers,
      blockBrokers,
      hashers,
      dns: dnsConfig
    })
  } else {
    config.routers.forEach((router) => {
      routers.push(delegatedHTTPRouting(router, {
        // NOTE: in practice 'transport-ipfs-gateway-http' exists only in IPNI results, we won't have any DHT results like this unless..
        // TODO: someguy starts doing active probing (https://github.com/ipfs/someguy/issues/53) to identify peers which have functional HTTP gateway
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

  return createVerifiedFetch(helia, { contentTypeParser })
}

type Libp2pDefaultsOptions = Pick<ConfigDb, 'routers' | 'enableWss' | 'enableWebTransport' | 'enableGatewayProviders'>

export async function libp2pDefaults (config: Libp2pDefaultsOptions): Promise<Libp2pOptions> {
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

  const libp2pOptions = {
    privateKey,
    addresses: {}, // no need to listen on any addresses
    transports,
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    services: {
      dcutr: dcutr(),
      identify: identify({
        agentVersion
      }),
      identifyPush: identifyPush({
        agentVersion
      }),
      keychain: keychain(),
      ping: ping()
    }
  } satisfies Libp2pOptions

  // Add delegated routing services for each passed delegated router endpoint
  config.routers.forEach((router, i) => {
    libp2pOptions.services[`delegatedRouter${i}`] = () => createDelegatedRoutingV1HttpApiClient(router, {
      filterProtocols: ['unknown', 'transport-bitswap', 'transport-ipfs-gateway-http'],
      filterAddrs
    })
  })

  return libp2pOptions
}
