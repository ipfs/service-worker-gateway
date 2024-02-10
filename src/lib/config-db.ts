import { Level } from 'level'

export interface ConfigDb {
  gateways: string[]
  routers: string[]
}

export type configDbKeys = keyof ConfigDb

function getConfigDb (): Level<configDbKeys, ConfigDb[configDbKeys]> {
  return new Level<configDbKeys, ConfigDb[configDbKeys]>('./config', { valueEncoding: 'json' })
}

function getLocalStorageKey (key: configDbKeys): string {
  return `helia-service-worker-gateway.config.${key}`
}

/**
 * If the key doesn't exist in the config db, set it to the default value.
 */
async function setDefaults <T extends configDbKeys> (config: Level<configDbKeys, ConfigDb[configDbKeys]>, key: T, value: ConfigDb[T]): Promise<void> {
  await config.get(key).catch(async () => {
    await config.put(key, value)
  })
}

// TODO: Create a User interface for setting configuration values for the service worker.
export async function loadFromLocalStorage (): Promise<void> {
  /**
   * Try to load values from localStorage if it's available, this will override whatever is set in the config db.
   */
  if (typeof globalThis.localStorage !== 'undefined') {
    const config = getConfigDb()
    /* eslint-disable no-console */
    console.group('You can customize the gateways and routers used by the service worker by running the following in the console:')
    console.log(`localStorage.setItem('${getLocalStorageKey('gateways')}', JSON.stringify(['http://localhost:8080']));
localStorage.setItem('${getLocalStorageKey('routers')}', JSON.stringify(['http://localhost:8080']));`)
    console.groupEnd()
    /* eslint-enable no-console */
    const localStorage = global.localStorage
    const localStorageGatewaysString = localStorage.getItem(getLocalStorageKey('gateways')) ?? '[]'
    const localStorageRoutersString = localStorage.getItem(getLocalStorageKey('routers')) ?? '[]'
    const gateways = JSON.parse(localStorageGatewaysString)
    const routers = JSON.parse(localStorageRoutersString)

    await config.put('gateways', gateways)
    await config.put('routers', routers)
    await config.close() // close the db on the main thread, so we can open it in the service-worker
  }
}

export async function getConfig (): Promise<ConfigDb> {
  const config = getConfigDb()
  await loadFromLocalStorage()

  await setDefaults(config, 'gateways', [])
  await setDefaults(config, 'routers', [])

  const gateways = await config.get('gateways')
  const routers = await config.get('routers')

  return {
    gateways: gateways instanceof Array ? gateways : [],
    routers: routers instanceof Array ? routers : []
  }
}
