import { trustlessGateway } from '@helia/block-brokers'
import { createHeliaHTTP } from '@helia/http'
import { delegatedHTTPRouting } from '@helia/routers'
import { LevelBlockstore } from 'blockstore-level'
import { LevelDatastore } from 'datastore-level'
import type { Helia } from '@helia/interface'

export async function getHelia (): Promise<Helia> {
  const helia = await createHeliaHTTP({
    blockstore: new LevelBlockstore('./blockstore'),
    datastore: new LevelDatastore('./datastore'),
    blockBrokers: [
      trustlessGateway({
        gateways: ['https://cloudflare-ipfs.com', 'https://dweb.link', 'https://trustless-gateway.dev']
      })
    ],
    routers: [
      delegatedHTTPRouting('https://delegated-ipfs.dev')
    ]
  })

  return helia
}
