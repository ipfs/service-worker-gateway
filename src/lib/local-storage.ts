export type LocalStorageRoots = 'config' | 'forms'

export function getLocalStorageKey (root: LocalStorageRoots, key: string): string {
  return `helia-service-worker-gateway.${root}.${key}`
}

export const LOCAL_STORAGE_KEYS = {
  config: {
    enableWss: getLocalStorageKey('config', 'enableWss'),
    enableWebTransport: getLocalStorageKey('config', 'enableWebTransport'),
    enableRecursiveGateways: getLocalStorageKey('config', 'enableRecursiveGateways'),
    enableGatewayProviders: getLocalStorageKey('config', 'enableGatewayProviders')
  },
  forms: {
    requestPath: getLocalStorageKey('forms', 'requestPath')
  }
}
