export interface Config {
  gateways: string[]
  routers: string[]
  dnsResolvers: Record<string, string | string[]>
  fetchTimeout: number
  serviceWorkerTTL: number
  debug: string
}

/**
 * Config used in production
 */
export const config: Config = {
  gateways: [
    'https://trustless-gateway.link'
  ],
  routers: [
    'https://delegated-ipfs.dev'
  ],
  dnsResolvers: {
    '.': 'https://delegated-ipfs.dev/dns-query'
  },
  fetchTimeout: 30_000,
  serviceWorkerTTL: 86_400_000,
  debug: globalThis?.location?.hostname?.search(/localhost|inbrowser\.dev|127\.0\.0\.1/) === -1 ? '' : '*,*:trace'
}
