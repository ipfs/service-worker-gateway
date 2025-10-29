import type { BitswapProvider, TrustlessGatewayProvider } from '@helia/block-brokers'

export function isBitswapProvider (prov?: any): prov is BitswapProvider {
  return prov?.type === 'bitswap'
}

export function isTrustlessGatewayProvider (prov?: any): prov is TrustlessGatewayProvider {
  return prov?.type === 'trustless-gateway'
}
