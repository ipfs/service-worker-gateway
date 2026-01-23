import { GenericIDB } from '../../lib/generic-db.ts'

/**
 * IndexedDB schema for each registered service worker
 *
 * NOTE: this is not intended to be shared between service workers, unlike the
 * default used by config-db.ts
 */
interface LocalSwConfig {
  installTimestamp: number
}

let swIdb: GenericIDB<LocalSwConfig>

export function getSwConfig (): GenericIDB<LocalSwConfig> {
  if (swIdb == null) {
    swIdb = new GenericIDB<LocalSwConfig>('helia-sw-unique', 'config')
  }

  return swIdb
}
