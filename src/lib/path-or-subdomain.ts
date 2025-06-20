import { base32 } from 'multiformats/bases/base32'
import { base36 } from 'multiformats/bases/base36'
import { CID } from 'multiformats/cid'
import { areSubdomainsSupported } from './config-db.js'
import { dnsLinkLabelEncoder } from './dns-link-labels.js'
import { getHeliaSwRedirectUrl } from './first-hit-helpers.js'
import { pathRegex, subdomainRegex } from './regex.js'
import type { ComponentLogger } from '@libp2p/logger'

export const isPathOrSubdomainRequest = (location: Pick<Location, 'host' | 'pathname'>): boolean => {
  return isPathGatewayRequest(location) || isSubdomainGatewayRequest(location)
}

export const isSubdomainGatewayRequest = (location: Pick<Location, 'host' | 'pathname'>): boolean => {
  const subdomainMatch = location.host.match(subdomainRegex)
  return subdomainMatch?.groups != null
}

export const isPathGatewayRequest = (location: Pick<Location, 'host' | 'pathname'>): boolean => {
  const pathMatch = location.pathname.match(pathRegex)
  return pathMatch?.groups != null
}

/**
 * Origin isolation check and enforcement
 * https://github.com/ipfs-shipyard/helia-service-worker-gateway/issues/30
 */
export const findOriginIsolationRedirect = async (location: Pick<Location, 'protocol' | 'host' | 'pathname' | 'search' | 'hash' | 'href' | 'origin'>, logger?: ComponentLogger): Promise<string | null> => {
  const log = logger?.forComponent('find-origin-isolation-redirect')
  if (isPathGatewayRequest(location) && !isSubdomainGatewayRequest(location)) {
    log?.trace('checking for subdomain support')
    if (await areSubdomainsSupported(logger) === true) {
      log?.trace('subdomain support is enabled')
      return toSubdomainRequest(location)
    } else {
      log?.trace('subdomain support is disabled')
    }
  }
  log?.trace('no need to check for subdomain support', isPathGatewayRequest(location), isSubdomainGatewayRequest(location))
  return null
}

export const toSubdomainRequest = (location: Pick<Location, 'protocol' | 'host' | 'pathname' | 'search' | 'hash' | 'href' | 'origin'>): string => {
  const segments = location.pathname.split('/').filter(segment => segment !== '')
  const ns = segments[0]
  let id = segments[1]

  // DNS labels are case-insensitive, and the length limit is 63.
  // We ensure base32 if CID, base36 if ipns,
  // or inlined according to https://specs.ipfs.tech/http-gateways/subdomain-gateway/#host-request-header if DNSLink name
  try {
    switch (ns) {
      case 'ipfs':
        // Base32 is case-insensitive and allows CID with popular hashes like sha2-256 to fit in a single DNS label
        id = CID.parse(id).toV1().toString(base32)
        break
      case 'ipns':
        // IPNS Names are represented as Base36 CIDv1 with libp2p-key codec
        // https://specs.ipfs.tech/ipns/ipns-record/#ipns-name
        // eslint-disable-next-line no-case-declarations
        const ipnsName = CID.parse(id).toV1()
        // /ipns/ namespace uses Base36 instead of 32 because ED25519 keys need to fit in DNS label of max length 63
        id = ipnsName.toString(base36)
        break
      default:
        throw new Error('Unknown namespace: ' + ns)
    }
  } catch (_) {
    // not a CID, so we assume a DNSLink name and inline it according to
    // https://specs.ipfs.tech/http-gateways/subdomain-gateway/#host-request-header
    if (id.includes('.')) {
      id = dnsLinkLabelEncoder(id)
    }
  }
  const remainingPath = `/${segments.slice(2).join('/')}`

  // create new URL with the subdomain but without the path
  const newLocation = new URL(`${location.protocol}//${id}.${ns}.${location.host}/`)

  const modifiedOriginalUrl = new URL(location.href)
  modifiedOriginalUrl.pathname = remainingPath
  modifiedOriginalUrl.hash = location.hash
  const originalSearchParams = new URLSearchParams(location.search)
  originalSearchParams.forEach((value, key) => {
    modifiedOriginalUrl.searchParams.set(key, value)
  })

  return getHeliaSwRedirectUrl(modifiedOriginalUrl, newLocation).href
}
