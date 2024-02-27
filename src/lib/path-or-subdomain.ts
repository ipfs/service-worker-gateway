// TODO: dry, this is same regex code  as in  getSubdomainParts
const subdomainRegex = /^(?<id>[^/]+)\.(?<protocol>ip[fn]s)\.[^/]+$/
const pathRegex = /^\/(?<protocol>ip[fn]s)\/(?<path>.*)$/

export const isPathOrSubdomainRequest = (location: Pick<Location, 'hostname' | 'pathname'>): boolean => {
  const subdomain = location.hostname
  const subdomainMatch = subdomain.match(subdomainRegex)

  const pathMatch = location.pathname.match(pathRegex)
  const isPathBasedRequest = pathMatch?.groups != null
  const isSubdomainRequest = subdomainMatch?.groups != null

  return isPathBasedRequest || isSubdomainRequest
}
