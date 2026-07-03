import type { BitswapProvider } from '@helia/bitswap'
import type { TrustlessGatewayProvider } from '@helia/trustless-gateway-client'

export function isBitswapProvider (prov?: any): prov is BitswapProvider {
  return prov?.type === 'bitswap'
}

export function isTrustlessGatewayProvider (prov?: any): prov is TrustlessGatewayProvider {
  return prov?.type === 'trustless-gateway'
}

export function isFallbackTrustlessGatewayProvider (prov?: any): prov is TrustlessGatewayProvider {
  return prov?.routing === 'http-gateway-routing' && prov?.type === 'trustless-gateway'
}
