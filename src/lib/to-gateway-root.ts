import { subdomainRegex } from './regex.ts'

/**
 * If we are on a path gateway, return the gateway URL without the path but with
 * the hash.
 *
 * If we are on a subdomain gateway, return the parent domain, without the path
 * but with the hash.
 */
export function toGatewayRoot (hash: string): string {
  return `${getGatewayRoot()}/#${hash}`
}

/**
 * If we are on a path gateway, return the gateway URL without the path.
 *
 * If we are on a subdomain gateway, return the parent domain without the path.
 */
export function getGatewayRoot (): string {
  const subdomainGatewayMatch = globalThis.location.href.match(subdomainRegex)

  if (subdomainGatewayMatch != null && subdomainGatewayMatch.groups != null) {
    return `${globalThis.location.protocol}//${subdomainGatewayMatch.groups.parentDomain}`
  }

  return `${globalThis.location.protocol}//${globalThis.location.host}`
}
