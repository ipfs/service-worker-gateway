import { type ComponentLogger, enable } from '@libp2p/logger'
import { GenericIDB, type BaseDbConfig } from './generic-db.js'

export interface ConfigDb extends BaseDbConfig {
  gateways: string[]
  routers: string[]
  dnsJsonResolvers: Record<string, string>
  enableWss: boolean
  enableWebTransport: boolean
  enableGatewayProviders: boolean
  enableRecursiveGateways: boolean
  debug: string
}

export const defaultGateways = ['https://trustless-gateway.link']
export const defaultRouters = ['https://delegated-ipfs.dev']
export const defaultDnsJsonResolvers: Record<string, string> = {
  '.': 'https://delegated-ipfs.dev/dns-query'
}
export const defaultEnableRecursiveGateways = true
export const defaultEnableWss = true
export const defaultEnableWebTransport = false
export const defaultEnableGatewayProviders = true

const configDb = new GenericIDB<ConfigDb>('helia-sw', 'config')

export async function resetConfig (): Promise<void> {
  await configDb.open()
  await configDb.put('gateways', defaultGateways)
  await configDb.put('routers', defaultRouters)
  await configDb.put('dnsJsonResolvers', defaultDnsJsonResolvers)
  await configDb.put('enableWss', defaultEnableWss)
  await configDb.put('enableWebTransport', defaultEnableWebTransport)
  await configDb.put('enableRecursiveGateways', defaultEnableRecursiveGateways)
  await configDb.put('enableGatewayProviders', defaultEnableGatewayProviders)
  await configDb.put('debug', '')
  configDb.close()
}

export async function setConfig (config: ConfigDb, logger: ComponentLogger): Promise<void> {
  const log = logger.forComponent('set-config')
  enable(config.debug ?? '') // set debug level first.
  log('config-debug: setting config %O for domain %s', config, window.location.origin)

  await configDb.open()
  await configDb.put('gateways', config.gateways)
  await configDb.put('routers', config.routers)
  await configDb.put('dnsJsonResolvers', config.dnsJsonResolvers)
  await configDb.put('enableRecursiveGateways', config.enableRecursiveGateways)
  await configDb.put('enableWss', config.enableWss)
  await configDb.put('enableWebTransport', config.enableWebTransport)
  await configDb.put('enableGatewayProviders', config.enableGatewayProviders)
  await configDb.put('debug', config.debug ?? '')
  configDb.close()
}

export async function getConfig (logger: ComponentLogger): Promise<ConfigDb> {
  const log = logger.forComponent('get-config')
  let gateways = defaultGateways
  let routers = defaultRouters
  let dnsJsonResolvers = defaultDnsJsonResolvers
  let enableRecursiveGateways
  let enableWss
  let enableWebTransport
  let enableGatewayProviders

  let debug = ''

  try {
    await configDb.open()

    gateways = await configDb.get('gateways')

    routers = await configDb.get('routers')

    dnsJsonResolvers = await configDb.get('dnsJsonResolvers')

    enableRecursiveGateways = await configDb.get('enableRecursiveGateways') ?? defaultEnableRecursiveGateways
    enableWss = await configDb.get('enableWss') ?? defaultEnableWss
    enableWebTransport = await configDb.get('enableWebTransport') ?? defaultEnableWebTransport
    enableGatewayProviders = await configDb.get('enableGatewayProviders') ?? defaultEnableGatewayProviders

    debug = await configDb.get('debug') ?? ''
    configDb.close()
    enable(debug)
  } catch (err) {
    log('error loading config from db', err)
  }

  if (gateways == null || gateways.length === 0) {
    gateways = [...defaultGateways]
  }

  if (routers == null || routers.length === 0) {
    routers = [...defaultRouters]
  }
  if (dnsJsonResolvers == null || Object.keys(dnsJsonResolvers).length === 0) {
    dnsJsonResolvers = { ...defaultDnsJsonResolvers }
  }

  // always return the config, even if we failed to load it.
  return {
    gateways,
    routers,
    dnsJsonResolvers,
    enableRecursiveGateways,
    enableWss,
    enableWebTransport,
    enableGatewayProviders,
    debug
  }
}

export async function validateConfig (config: ConfigDb, logger: ComponentLogger): Promise<void> {
  const log = logger.forComponent('validate-config')

  if (!config.enableRecursiveGateways && !config.enableGatewayProviders && !config.enableWss && !config.enableWebTransport) {
    log.error('Config is invalid. At least one of the following must be enabled: recursive gateways, gateway providers, wss, or webtransport.')
    throw new Error('Config is invalid. At least one of the following must be enabled: recursive gateways, gateway providers, wss, or webtransport.')
  }
}
