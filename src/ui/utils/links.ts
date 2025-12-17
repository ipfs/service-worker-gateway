import { CID } from 'multiformats/cid'
import { isSubdomainGatewayRequest } from '../../lib/path-or-subdomain.ts'
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
  const url = new URL(window.location.href)
  const isSubdomain = isSubdomainGatewayRequest(url)
  const search = createSearch(url.searchParams, {
    params
  })

  // if no pathname passed, detect from the current URL
  if (ipfsPath == null) {
    if (isSubdomain) {
      if (url.hostname.includes('.ipns.')) {
        ipfsPath = `/ipns/${url.hostname.split('.ipns.')[0]}${url.pathname === '/' ? '' : url.pathname}`
      } else {
        ipfsPath = `/ipfs/${url.hostname.split('.ipfs.')[0]}${url.pathname === '/' ? '' : url.pathname}`
      }
    } else {
      ipfsPath = url.pathname
    }
  }

  const [,, cid, ...rest] = ipfsPath.split('/')
  const path = '/' + rest.filter(segment => segment.trim() !== '').join('/')

  if (isSubdomain) {
    const host = (url.host.includes('.ipfs.') ? url.host.split('.ipfs.') : url.host.split('.ipns.'))[1]

    return `${url.protocol}//${CID.parse(cid).toV1()}.ipfs.${host}${path === '/' ? '' : path}${search}${hash ?? url.hash}`
  }

  return `${url.protocol}//${url.host}/ipfs/${cid}${path === '/' ? '' : path}${search}${hash ?? url.hash}`
}
