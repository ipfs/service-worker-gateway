import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { createDelegatedRoutingV1HttpApiClient } from '@helia/delegated-routing-v1-http-api-client'
import { createHeliaHTTP } from '@helia/http'
import { httpGatewayRouting, delegatedHTTPRouting } from '@helia/routers'
import { createVerifiedFetch, type VerifiedFetch } from '@helia/verified-fetch'
import { generateKeyPair } from '@libp2p/crypto/keys'
import { dcutr } from '@libp2p/dcutr'
import { identify, identifyPush } from '@libp2p/identify'
import { keychain } from '@libp2p/keychain'
import { ping } from '@libp2p/ping'
import { webRTCDirect } from '@libp2p/webrtc'
import { webSockets } from '@libp2p/websockets'
import { webTransport } from '@libp2p/webtransport'
import { dns } from '@multiformats/dns'
import { dnsJsonOverHttps } from '@multiformats/dns/resolvers'
import { createHelia, type Helia, type Routing } from 'helia'
import { createLibp2p, type Libp2pOptions } from 'libp2p'
import * as libp2pInfo from 'libp2p/version'
import { contentTypeParser } from './content-type-parser.js'
import type { ConfigDb } from './config-db'
import type { ComponentLogger } from '@libp2p/logger'

export async function getVerifiedFetch (config: ConfigDb, logger: ComponentLogger): Promise<VerifiedFetch> {
  const log = logger.forComponent('get-verified-fetch')
  log(`config-debug: got config for sw location ${self.location.origin}`, config)

  const routers: Array<Partial<Routing>> = config.routers.map((routerUrl) => delegatedHTTPRouting(routerUrl))

  if (config.gateways.length > 0) {
    routers.push(httpGatewayRouting({ gateways: config.gateways }))
  }

  // set dns resolver instances
  const dnsResolvers = {}
  for (const [key, value] of Object.entries(config.dnsJsonResolvers)) {
    dnsResolvers[key] = dnsJsonOverHttps(value)
  }

  let helia: Helia

  if (config.p2pRetrieval) {
    const libp2pOptions = await libp2pDefaults()
    const libp2p = await createLibp2p(libp2pOptions)

    helia = await createHelia({
      libp2p,
      routers,
      dns: dns(dnsResolvers)
    })
  } else {
    helia = await createHeliaHTTP({
      routers,
      dns: dns(dnsResolvers)
    })
  }

  return createVerifiedFetch(helia, { contentTypeParser })
}

export async function libp2pDefaults (): Promise<Libp2pOptions> {
  const agentVersion = `@helia/verified-fetch ${libp2pInfo.name}/${libp2pInfo.version} UserAgent=${globalThis.navigator.userAgent}`
  const privateKey = await generateKeyPair('Ed25519')

  return {
    privateKey,
    addresses: {}, // no need to listen on any addresses
    transports: [webRTCDirect(), webTransport(), webSockets()],
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    services: {
      delegatedRouting: () =>
        createDelegatedRoutingV1HttpApiClient('https://delegated-ipfs.dev', {
          filterProtocols: ['unknown', 'transport-bitswap', 'transport-ipfs-gateway-http'],
          filterAddrs: ['https', 'webtransport', 'wss']
        }),
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
  }
}
