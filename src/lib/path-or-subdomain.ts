import { isIP } from '@chainsafe/is-ip'
import { InvalidParametersError } from '@libp2p/interface'
import { peerIdFromString } from '@libp2p/peer-id'
import { base16, base16upper } from 'multiformats/bases/base16'
import { base32 } from 'multiformats/bases/base32'
import { base36 } from 'multiformats/bases/base36'
import { base58btc } from 'multiformats/bases/base58'
import { CID } from 'multiformats/cid'
import { QUERY_PARAMS } from './constants.ts'
import { dnsLinkLabelEncoder } from './dns-link-labels.js'
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
export const findOriginIsolationRedirect = (location: Pick<Location, 'protocol' | 'host' | 'pathname' | 'search' | 'hash' | 'href' | 'origin'>, logger: Logger, supportsSubdomains: boolean | null): URL | null => {
  const log = logger?.newScope('find-origin-isolation-redirect')

  try {
    if (isSubdomainGatewayRequest(location)) {
      // already on an isolated origin
      return null
    }

    if (isPathGatewayRequest(location)) {
      log?.trace('checking for subdomain support')

      if (supportsSubdomains === true) {
        log?.trace('subdomain support is enabled')
        return toSubdomainRequest(new URL(location.href))
      }
    }
  } catch (err) {
    log.error('could not parse gateway request from URL - %e', err)
  }

  // not path/subdomain request - we are showing UI
  return null
}

/**
 * Turns a path gateway url into a subdomain gateway url, possibly with a
 * redirect param if a path into the CID was present.
 *
 * Throws an `InvalidParametersError` if the user supplied a bad CID or path
 * or `Error` if subdomains are unsupported because (for example) the gateway
 * is accessed via an IP address instead of a domain.
 */
export const toSubdomainRequest = (location: URL): URL => {
  if (isIP(location.host)) {
    throw new Error('Host was an IP address so subdomains are unsupported')
  }

  // do not need to convert this
  if (isSubdomainGatewayRequest(location)) {
    return location
  }

  const segments = location.pathname
    .split('/')
    .filter(segment => segment !== '')

  if (segments.length < 2) {
    throw new InvalidParametersError(`Invalid location ${location}`)
  }

  const ns = segments[0]
  let id = segments[1]

  // DNS labels are case-insensitive, and the length limit is 63.
  // We ensure base32 if CID, base36 if ipns, or inlined if DNSLink name
  // https://specs.ipfs.tech/http-gateways/subdomain-gateway/#host-request-header
  switch (ns) {
    case 'ipfs':
      // Base32 is case-insensitive and allows CID with popular hashes like
      // sha2-256 to fit in a single DNS label
      id = parseCID(id).toString(base32)
      break
    case 'ipns':
      if (id.startsWith('Q') || id.startsWith('1')) {
        // possibly a PeerId - non-standard but try converting to a CID
        try {
          const peerId = peerIdFromString(id)
          id = peerId.toCID().toString()
        } catch {}
      }

      try {
        // IPNS Names are represented as Base36 CIDv1 with libp2p-key codec
        // https://specs.ipfs.tech/ipns/ipns-record/#ipns-name

        // /ipns/ namespace uses Base36 instead of 32 because ED25519 keys need
        // to fit in DNS label of max length 63
        id = parseCID(id).toString(base36)
      } catch {
        // not a CID, so we assume a DNSLink name and inline it
        id = dnsLinkLabelEncoder(id)
      }
      break
    default:
      // ignore unknown namespaces
  }

  const remainingPath = segments.slice(2).join('/')

  // create new URL with the subdomain but without the path
  let subdomain = `${location.protocol}//${id}.${ns}.${location.host}`

  // append the
  let redirect = ''

  if (remainingPath !== '') {
    redirect += `/${remainingPath}`
  }

  if (location.search !== '') {
    redirect += location.search
  }

  if (location.hash !== '') {
    redirect += location.hash
  }

  if (redirect !== '') {
    subdomain += `?${QUERY_PARAMS.REDIRECT}=${encodeURIComponent(redirect)}`
  }

  return new URL(subdomain)
}

/**
 * Parses the string as a CID and converts it to v1. Translates any thrown error
 * to an `InvalidParametersError` so we can show a 400 screen to the user.
 */
function parseCID (str: string): CID<any, any, any, 1> {
  try {
    return CID.parse(str, findMultibaseDecoder(str)).toV1()
  } catch (err: any) {
    throw new InvalidParametersError(`Could not parse CID from string "${str}" - ${err.message}`)
  }
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
