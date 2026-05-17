import type { Config } from './index.ts'

/**
 * Config used during tests, replaced in build.js by configFilePlugin
 */
export const config: Config = {
  gateways: [
    'http://127.0.0.1:8088'
  ],
  routers: [
    'http://127.0.0.1:8088'
  ],
  dnsResolvers: {
    '.': 'http://127.0.0.1:3335/dns-query'
  },
  fetchTimeout: 1_000,
  serviceWorkerTTL: 86_400_000,
  debug: '*,*:trace',
  ens: {
    // Pointed at the local test fixture server
    primaryRpc: 'http://127.0.0.1:3336',
    witnessRpcs: [
      'http://127.0.0.1:3337',
      'http://127.0.0.1:3338'
    ],
    maxSafeBlockAgeMs: 60 * 60 * 24 * 365 * 1_000 // never stale in tests
  }
}
