import type { Config } from './index.ts'

/**
 * Config used during development (e.g. after npm run start), replaced in
 * build.js by configFilePlugin
 */
export const config: Config = {
  gateways: [
    'https://trustless-gateway.link',
    'http://127.0.0.1:8088'
  ],
  routers: [
    'https://delegated-ipfs.dev',
    'http://127.0.0.1:8088'
  ],
  dnsResolvers: {
    '.': [
      'https://delegated-ipfs.dev/dns-query',
      'http://127.0.0.1:3335/dns-query'
    ]
  },
  fetchTimeout: 30_000,
  serviceWorkerTTL: 86_400_000,
  debug: '*,*:trace'
}
