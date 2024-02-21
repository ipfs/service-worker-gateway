const subdomainRegex = /^(?<origin>[^/]+)\.(?<protocol>ip[fn]s)?$/
const pathRegex = /^\/(?<protocol>ip[fn]s)\/(?<path>.*)$/

export const isPathOrSubdomainRequest = (baseUrl: string, location: Pick<Location, 'hostname' | 'pathname'>): boolean => {
  const subdomain = location.hostname.replace(`.${baseUrl}`, '')
  const subdomainMatch = subdomain.match(subdomainRegex)

  const pathMatch = location.pathname.match(pathRegex)
  const isPathBasedRequest = pathMatch?.groups != null
  const isSubdomainRequest = subdomainMatch?.groups != null

  return isPathBasedRequest || isSubdomainRequest
}
