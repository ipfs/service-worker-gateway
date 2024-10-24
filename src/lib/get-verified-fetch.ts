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
import { dns } from '@multiformats/dns'
import { dnsJsonOverHttps } from '@multiformats/dns/resolvers'
import { createHelia, type Helia, type Routing } from 'helia'
import { createLibp2p, type Libp2pOptions } from 'libp2p'
import * as libp2pInfo from 'libp2p/version'
import { contentTypeParser } from './content-type-parser.js'
import type { ConfigDb } from './config-db.js'
import type { ComponentLogger } from '@libp2p/logger'

export async function getVerifiedFetch (config: ConfigDb, logger: ComponentLogger): Promise<VerifiedFetch> {
  const log = logger.forComponent('get-verified-fetch')
  log(`config-debug: got config for sw location ${self.location.origin}`, JSON.stringify(config, null, 2))

  if (!config.enableRecursiveGateways && !config.enableGatewayProviders && !config.enableWss && !config.enableWebTransport) {
    // crude validation
    throw new Error('Config is invalid. At least one of the following must be enabled: recursive gateways, gateway providers, wss, or webtransport.')
  }

  // Start by adding the config routers as delegated routers
  const routers: Array<Partial<Routing>> = []

  if (config.enableRecursiveGateways) {
    // Only add the gateways if the recursive gateways toggle is enabled
    routers.push(httpGatewayRouting({ gateways: config.gateways }))
  }

  // set dns resolver instances
  const dnsResolvers = {}
  for (const [key, value] of Object.entries(config.dnsJsonResolvers)) {
    dnsResolvers[key] = dnsJsonOverHttps(value)
  }

  const blockBrokers: Array<(components: any) => BlockBroker> = []

  if (config.enableGatewayProviders) {
    blockBrokers.push(trustlessGateway())
  }

  let helia: Helia
  if (config.enableWss || config.enableWebTransport) {
    // If we are using websocket or webtransport, we need to instantiate libp2p
    blockBrokers.push(bitswap())
    const libp2pOptions = await libp2pDefaults(config)
    const libp2p = await createLibp2p(libp2pOptions)
    routers.push(libp2pRouting(libp2p))

    helia = await createHelia({
      libp2p,
      routers,
      blockBrokers,
      dns: dns(dnsResolvers)
    })
  } else {
    // TODO: Pass IPIP-484 filter config once https://github.com/ipfs/helia/pull/654 is merged
    config.routers.forEach((router) => {
      routers.push(delegatedHTTPRouting(router))
    })

    helia = await createHeliaHTTP({
      routers,
      blockBrokers,
      dns: dns(dnsResolvers)
    })
  }

  return createVerifiedFetch(helia, { contentTypeParser })
}

type Libp2pDefaultsOptions = Pick<ConfigDb, 'routers' | 'enableWss' | 'enableWebTransport'>

export async function libp2pDefaults (config: Libp2pDefaultsOptions): Promise<Libp2pOptions> {
  const agentVersion = `@helia/verified-fetch ${libp2pInfo.name}/${libp2pInfo.version} UserAgent=${globalThis.navigator.userAgent}`
  const privateKey = await generateKeyPair('Ed25519')

  const filterAddrs = ['https']

  const transports: Array<(components: any) => any> = []

  if (config.enableWss) {
    transports.push(webSockets())
    filterAddrs.push('wss')
  }
  if (config.enableWebTransport) {
    transports.push(webTransport())
    filterAddrs.push('webtransport')
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
