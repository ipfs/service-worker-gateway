import { uiLogger } from './logger.js'

export const localGwUrl = 'http://127.0.0.1:8080'
// bafkqacdjobthgllto4fa is the inline CID for the string 'ipfs-sw'
const localGwTestUrl = 'http://127.0.0.1:8080/ipfs/bafkqacdjobthgllto4fa'

const log = uiLogger.forComponent('local-gateway-prober')

export async function hasLocalGateway (): Promise<boolean> {
  try {
    log(`probing for local trustless gateway at ${localGwTestUrl}`)
    const resp = await fetch(localGwTestUrl, {
      cache: 'no-store',
      method: 'HEAD'
    })
    if (!resp.ok) {
      return false
    }
    log(`found local trustless gateway at ${localGwTestUrl}`)
    return true
  } catch (e: unknown) {
    log.error('failed to probe trustless gateway', e)
    const currentLocation = location.href.replace(location.pathname, '').replace(location.search, '').replace(location.hash, '').replace(/\/$/, '')
    log(`You may want to enable CORS if you do have a local gateway running:\nipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["${currentLocation}", "http://127.0.0.1:5001", "https://webui.ipfs.io"]'`)
    return false
  }
}
