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
  const url = new URL(globalThis.location.href)

  if (url.host.includes('.ipfs.')) {
    return `${url.protocol}//${url.host.split('.ipfs.').pop()}`
  }

  if (url.host.includes('.ipns.')) {
    return `${url.protocol}//${url.host.split('.ipns.').pop()}`
  }

  return `${globalThis.location.protocol}//${globalThis.location.host}`
}
