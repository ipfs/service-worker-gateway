import { CID } from 'multiformats/cid'
import { dnsLinkLabelEncoder } from '../../lib/dns-link-labels.ts'
import { parseRequest } from '../../lib/parse-request-cheap.ts'
import { createSearch } from '../../lib/query-helpers.ts'

interface CreateLinkOptions {
  ipfsPath?: string
  params?: Record<string, string>
  hash?: string
}

/**
 * Returns a string URL based on the current page href, optionally replacing
 * any existing params or fragment
 */
export function createLink ({ ipfsPath, params, hash }: CreateLinkOptions): string {
  const currentPage = new URL(window.location.href)
  const request = parseRequest(currentPage, currentPage)

  if (request.type === 'external' || request.type === 'internal') {
    throw new Error(`Could not parse subdomain from ${request.type ?? 'unknown'} url`)
  }

  const subdomainURL = request.subdomainURL

  const search = createSearch(subdomainURL.searchParams, {
    params
  })

  // if no pathname passed, detect from the current URL
  if (ipfsPath == null) {
    if (subdomainURL.hostname.includes('.ipns.')) {
      ipfsPath = `/ipns/${subdomainURL.hostname.split('.ipns.')[0]}${subdomainURL.pathname === '/' ? '' : subdomainURL.pathname}`
    } else {
      ipfsPath = `/ipfs/${subdomainURL.hostname.split('.ipfs.')[0]}${subdomainURL.pathname === '/' ? '' : subdomainURL.pathname}`
    }
  }

  const [,, cid, ...rest] = ipfsPath.split('/')
  const path = '/' + rest
    .filter(segment => segment.trim() !== '')
    .map(segment => encodeURIComponent(segment))
    .join('/')

  const host = (subdomainURL.host.includes('.ipfs.') ? subdomainURL.host.split('.ipfs.') : subdomainURL.host.split('.ipns.'))[1]

  try {
    return `${subdomainURL.protocol}//${CID.parse(cid).toV1()}.ipfs.${host}${path === '/' ? '' : path}${search}${hash ?? subdomainURL.hash}`
  } catch {
    return `${subdomainURL.protocol}//${dnsLinkLabelEncoder(cid)}.ipns.${host}${path === '/' ? '' : path}${search}${hash ?? subdomainURL.hash}`
  }
}
