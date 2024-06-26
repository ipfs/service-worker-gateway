import { uiLogger } from './logger.js'

export const localGwUrl = 'http://localhost:8080'
// export const localGwUrl = 'http://localhost:8080'
const localGwTestUrl = `${localGwUrl}/ipfs/bafkqablimvwgy3y?format=raw`
const expectedContentType = 'application/vnd.ipld.raw'
const expectedResponseBody = 'hello'

const log = uiLogger.forComponent('local-gateway-prober')

export async function hasLocalGateway (): Promise<boolean> {
  try {
    log(`probing for local trustless gateway at ${localGwTestUrl}`)
    const resp = await fetch(localGwTestUrl, { cache: 'no-store' })
    if (!resp.ok) {
      return false
    }
    if (resp.headers.get('Content-Type') !== expectedContentType) {
      return false
    }
    const respBody = await resp.text()

    if (respBody === expectedResponseBody) {
      log(`found local trustless gateway at ${localGwTestUrl}`)
      return true
    } else {
      return false
    }
  } catch (e: unknown) {
    log.error('failed to probe trustless gateway', e)
    return false
  }
}
