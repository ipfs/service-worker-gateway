import { trustlessGateway } from '@helia/block-brokers'
import { createHeliaHTTP } from '@helia/http'
import { delegatedHTTPRouting } from '@helia/routers'
import { IDBBlockstore } from 'blockstore-idb'
import { IDBDatastore } from 'datastore-idb'
import { getConfig } from './lib/config-db'
import type { Helia } from '@helia/interface'

export async function getHelia (): Promise<Helia> {
  const config = await getConfig()
  const blockstore = new IDBBlockstore('./helia-sw/blockstore')
  const datastore = new IDBDatastore('./helia-sw/datastore')
  await blockstore.open()
  await datastore.open()

  const helia = await createHeliaHTTP({
    blockstore,
    datastore,
    blockBrokers: [
      trustlessGateway({
        gateways: ['https://cloudflare-ipfs.com', 'https://dweb.link', 'https://trustless-gateway.dev', ...config.gateways]
      })
    ],
    routers: ['https://delegated-ipfs.dev', ...config.routers].map(rUrl => delegatedHTTPRouting(rUrl))
  })

  return helia
}
