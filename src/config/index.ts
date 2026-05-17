export interface EnsConfig {
  /**
   * Primary Ethereum RPC endpoint. Must support eth_getProof and
   * eth_getBlockByNumber.
   */
  primaryRpc: string
  /**
   * Two witness Ethereum RPC endpoints used to independently verify the safe
   * block returned by the primary. Only eth_getBlockByNumber is required.
   */
  witnessRpcs: [string, string]
  /**
   * Maximum age in milliseconds for the safe block timestamp before we
   * consider it stale and reject the lookup.
   */
  maxSafeBlockAgeMs: number
}

export interface Config {
  gateways: string[]
  routers: string[]
  dnsResolvers: Record<string, string | string[]>
  fetchTimeout: number
  serviceWorkerTTL: number
  debug: string
  ens: EnsConfig
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
  debug: globalThis?.location?.hostname?.search(/localhost|inbrowser\.dev|127\.0\.0\.1/) === -1 ? '' : '*,*:trace',
  ens: {
    // Primary endpoint for safe block and proof-backed ENS reads
    primaryRpc: 'https://ethereum.publicnode.com',
    // Two independent witness providers for block-hash verification
    witnessRpcs: [
      'https://eth-mainnet.public.blastapi.io',
      'https://mainnet.gateway.tenderly.co'
    ],
    // Reject safe-head older than 5 minutes
    maxSafeBlockAgeMs: 20 * 60 * 1_000
  }
}
