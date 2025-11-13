import { peerIdFromString } from '@libp2p/peer-id'
import { base16, base16upper } from 'multiformats/bases/base16'
import { base32 } from 'multiformats/bases/base32'
import { base36 } from 'multiformats/bases/base36'
import { base58btc } from 'multiformats/bases/base58'
import { CID } from 'multiformats/cid'
import { dnsLinkLabelEncoder } from './dns-link-labels.js'
import { getHeliaSwRedirectUrl } from './first-hit-helpers.js'
import { pathRegex, subdomainRegex } from './regex.js'
import type { Logger } from '@libp2p/interface'
import type { MultibaseDecoder } from 'multiformats/cid'

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
export const findOriginIsolationRedirect = (location: Pick<Location, 'protocol' | 'host' | 'pathname' | 'search' | 'hash' | 'href' | 'origin'>, logger: Logger, supportsSubdomains: boolean | null): string | null => {
  const log = logger?.newScope('find-origin-isolation-redirect')

  if (isSubdomainGatewayRequest(location)) {
    // already on an isolated origin
    return null
  }

  if (isPathGatewayRequest(location)) {
    log?.trace('checking for subdomain support')

    if (supportsSubdomains === true) {
      log?.trace('subdomain support is enabled')
      return toSubdomainRequest(location)
    }
  }

  // not path/subdomain request - we are showing UI
  return null
}

export const toSubdomainRequest = (location: Pick<Location, 'protocol' | 'host' | 'pathname' | 'search' | 'hash' | 'href' | 'origin'>): string => {
  const segments = location.pathname
    .split('/')
    .filter(segment => segment !== '')

  // remove cloudflare redirect
  if (segments[0] === 'index.html') {
    segments.shift()
  }

  if (segments.length < 2) {
    throw new Error(`Invalid location ${location}`)
  }

  const ns = segments[0]
  let id = segments[1]

  // DNS labels are case-insensitive, and the length limit is 63.
  // We ensure base32 if CID, base36 if ipns,
  // or inlined according to https://specs.ipfs.tech/http-gateways/subdomain-gateway/#host-request-header if DNSLink name
  try {
    switch (ns) {
      case 'ipfs':
        // Base32 is case-insensitive and allows CID with popular hashes like
        // sha2-256 to fit in a single DNS label
        id = CID.parse(id, findMultibaseDecoder(id)).toV1().toString(base32)
        break
      case 'ipns':
        if (id.startsWith('Q') || id.startsWith('1')) {
          // possibly a PeerId - non-standard but try converting to a CID
          try {
            const peerId = peerIdFromString(id)
            id = peerId.toCID().toString()
          } catch {}
        }

        // IPNS Names are represented as Base36 CIDv1 with libp2p-key codec
        // https://specs.ipfs.tech/ipns/ipns-record/#ipns-name
        // eslint-disable-next-line no-case-declarations
        const ipnsName = CID.parse(id, findMultibaseDecoder(id)).toV1()
        // /ipns/ namespace uses Base36 instead of 32 because ED25519 keys need
        // to fit in DNS label of max length 63
        id = ipnsName.toString(base36)
        break
      default:
        throw new Error('Unknown namespace: ' + ns)
    }
  } catch {
    // not a CID, so we assume a DNSLink name and inline it according to
    // https://specs.ipfs.tech/http-gateways/subdomain-gateway/#host-request-header
    if (id?.includes('.') === true) {
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

function findMultibaseDecoder (str: string): MultibaseDecoder<string> | undefined {
  const prefix = str.substring(0, 1)

  switch (prefix) {
    case 'b':
      return base32
    case 'f':
      return base16
    case 'F':
      return base16upper
    case 'z':
      return base58btc
    default:
      // do nothing
  }
}
