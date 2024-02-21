export type LocalStorageRoots = 'config' | 'forms'
export function getLocalStorageKey (root: LocalStorageRoots, key: string): string {
  return `helia-service-worker-gateway.${root}.${key}`
}
