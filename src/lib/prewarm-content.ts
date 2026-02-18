import { base36 } from 'multiformats/bases/base36'
import type { ResolvableURI } from './parse-request.ts'
import type { Config } from '../config/index.ts'

const FILTER_ADDRS = 'wss,tls,https'
const FILTER_PROTOCOLS = 'unknown,transport-bitswap,transport-ipfs-gateway-http'

function toArray (value: string | string[]): string[] {
  return Array.isArray(value) ? value : [value]
}

function joinPath (basePathname: string, suffix: string): string {
  const base = basePathname.endsWith('/') ? basePathname.slice(0, -1) : basePathname

  if (base.length === 0) {
    return suffix
  }

  return `${base}${suffix}`
}

function warmRequest (url: URL): void {
  void fetch(url.toString(), {
    method: 'GET',
    mode: 'cors',
    credentials: 'omit',
    cache: 'force-cache',
    keepalive: true
  }).catch(() => {
    // ignore prewarm errors, this is a best-effort optimization
  })
}

export function buildPrewarmUrls (request: ResolvableURI, options: Pick<Config, 'routers' | 'dnsResolvers'>): URL[] {
  const urls: URL[] = []
  const routers = options.routers.map(router => new URL(router))
  const resolvers = Object.values(options.dnsResolvers)
    .flatMap(value => toArray(value))
    .map(resolver => new URL(resolver))

  if (request.type === 'internal' || request.type === 'external') {
    return urls
  }

  if (request.protocol === 'ipfs') {
    routers.forEach(router => {
      const url = new URL(router.toString())
      url.pathname = joinPath(url.pathname, `/routing/v1/providers/${request.cid.toString()}`)
      url.searchParams.set('filter-addrs', FILTER_ADDRS)
      url.searchParams.set('filter-protocols', FILTER_PROTOCOLS)
      urls.push(url)
    })
  }

  if (request.protocol === 'ipns') {
    routers.forEach(router => {
      const url = new URL(router.toString())
      url.pathname = joinPath(url.pathname, `/routing/v1/ipns/${request.peerId.toCID().toString(base36)}`)
      urls.push(url)
    })
  }

  if (request.protocol === 'dnslink') {
    resolvers.forEach(resolver => {
      const url = new URL(resolver.toString())
      url.searchParams.set('name', `_dnslink.${request.domain}`)
      url.searchParams.set('type', 'TXT')
      urls.push(url)
    })
  }

  return urls
}

export function prewarmContentRequest (request: ResolvableURI, options: Pick<Config, 'routers' | 'dnsResolvers'>): void {
  buildPrewarmUrls(request, options).forEach(url => {
    warmRequest(url)
  })
}
