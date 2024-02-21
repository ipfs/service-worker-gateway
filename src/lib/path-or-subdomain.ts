export const isPathOrSubdomainRequest = (baseUrl: string, location: Pick<Location, 'hostname' | 'pathname'>): boolean => {
  const subdomain = location.hostname.replace(`.${baseUrl}`, '')
  const subdomainRegex = /^(?<origin>[^/]+)\.(?<protocol>ip[fn]s)?$/
  const subdomainMatch = subdomain.match(subdomainRegex)

  const isPathBasedRequest = location.pathname.startsWith('/ip')
  const isSubdomainRequest = subdomainMatch?.groups != null

  return isPathBasedRequest || isSubdomainRequest
}
