export type LocalStorageRoots = 'config' | 'forms'

export function getLocalStorageKey (root: LocalStorageRoots, key: string): string {
  return `helia-service-worker-gateway.${root}.${key}`
}

export const LOCAL_STORAGE_KEYS = {
  config: {
    gateways: getLocalStorageKey('config', 'gateways'),
    routers: getLocalStorageKey('config', 'routers'),
    enableWss: getLocalStorageKey('config', 'enableWss'),
    enableWebTransport: getLocalStorageKey('config', 'enableWebTransport'),
    enableRecursiveGateways: getLocalStorageKey('config', 'enableRecursiveGateways'),
    enableGatewayProviders: getLocalStorageKey('config', 'enableGatewayProviders'),
    autoReload: getLocalStorageKey('config', 'autoReload'),
    dnsJsonResolvers: getLocalStorageKey('config', 'dnsJsonResolvers'),
    debug: getLocalStorageKey('config', 'debug')
  },
  forms: {
    requestPath: getLocalStorageKey('forms', 'requestPath')
  }
}

export const convertUrlArrayToInput = (urls: string[]): string => {
  return urls.join('\n')
}

export const convertUrlInputToArray = (newlineDelimitedString: string): string[] => {
  return newlineDelimitedString.length > 0 ? newlineDelimitedString.split('\n').map((u) => u.trim()) : []
}

export const convertDnsResolverObjectToInput = (dnsResolvers: Record<string, string>): string => {
  return Object.entries(dnsResolvers).map(([key, url]) => `${key} ${url}`).join('\n')
}

export const convertDnsResolverInputToObject = (dnsResolverInput: string): Record<string, string> => {
  return dnsResolverInput.split('\n').map((u) => u.trim().split(' ')).reduce((acc, [key, url]) => {
    acc[key] = url
    return acc
  }, {})
}
