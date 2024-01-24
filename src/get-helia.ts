import type { Helia } from '@helia/interface'
import { createHeliaHTTP } from '@helia/http'
import { trustlessGateway } from '@helia/block-brokers'
import { delegatedHTTPRouting } from '@helia/routers'

// import debug from 'debug'
// debug.enable('libp2p:websockets,libp2p:webtransport,libp2p:kad-dht,libp2p:dialer*,libp2p:connection-manager')
// debug.enable('libp2p:*:error')
// debug.enable('libp2p:connection-manager:auto-dialler')
// debug.enable('libp2p:*:error,libp2p:dialer*,libp2p:connection-manager*,libp2p:webtransport,-*:trace')
// debug.enable('libp2p:connection-manager*,libp2p:dialer*,libp2p:delegated*')
// debug.enable('libp2p:*,-*:trace')
// debug.enable('libp2p:webtransport*,libp2p:connection-manager*')

export async function getHelia (): Promise<Helia> {
  const helia = await createHeliaHTTP({
    blockBrokers: [
      trustlessGateway({
        gateways: ['https://cloudflare-ipfs.com', 'https://ipfs.io']
      })
    ],
    routers: [
      delegatedHTTPRouting('https://delegated-ipfs.dev')
    ]
  })

  console.log('helia peerId: ', helia.libp2p.peerId.toString())

  return helia
}
