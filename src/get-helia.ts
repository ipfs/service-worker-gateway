import { createVerifiedFetch, type VerifiedFetch } from '@helia/verified-fetch'
import { getConfig } from './lib/config-db.ts'
import { trace } from './lib/logger.ts'
import { dnsJsonOverHttps } from '@helia/ipns/dns-resolvers'
import { contentTypeParser } from './lib/content-type-parser.ts'

export async function getVerifiedFetch (): Promise<VerifiedFetch> {
  const config = await getConfig()
  trace(`config-debug: got config for sw location ${self.location.origin}`, config)

  const verifiedFetch = await createVerifiedFetch({
    gateways: config.gateways,
    routers: config.routers,
    dnsResolvers: ['https://delegated-ipfs.dev/dns-query'].map(dnsJsonOverHttps)
  }, {
    contentTypeParser
  })

  return verifiedFetch
}