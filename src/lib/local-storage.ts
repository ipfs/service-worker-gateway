export type LocalStorageRoots = 'config' | 'forms'

export function getLocalStorageKey (root: LocalStorageRoots, key: string): string {
  return `helia-service-worker-gateway.${root}.${key}`
}

export const LOCAL_STORAGE_KEYS = {
  config: {
    gateways: getLocalStorageKey('config', 'gateways'),
    routers: getLocalStorageKey('config', 'routers'),
    autoReload: getLocalStorageKey('config', 'autoReload'),
    delegatedRouting: getLocalStorageKey('config', 'delegatedRouting'),
    dnsJsonResolvers: getLocalStorageKey('config', 'dnsJsonResolvers'),
    debug: getLocalStorageKey('config', 'debug')
  },
  forms: {
    requestPath: getLocalStorageKey('forms', 'requestPath')
  }
}
