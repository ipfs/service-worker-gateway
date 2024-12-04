import { areSubdomainsSupported, setSubdomainsSupported } from './config-db.js'
import { isSubdomainGatewayRequest } from './path-or-subdomain.js'

/**
 * Note that this function should only be used by the UI, as it relies on the
 * loading images from the subdomain gateway to determine if subdomains are
 * supported.
 */
export async function checkSubdomainSupport (): Promise<void> {
  if (!isSubdomainGatewayRequest(location) && await areSubdomainsSupported() === null) {
    const testUrl = `${location.protocol}//bafkqaaa.ipfs.${location.host}/ipfs-sw-1x1.png`
    await new Promise<boolean>((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        // eslint-disable-next-line no-console
        console.log('in image onload')
        resolve(true)
      }
      img.onerror = (err) => {
        // eslint-disable-next-line no-console
        console.log('in image onerror', err)
        resolve(false)
      }
      img.src = testUrl
    }).then(async (supportsSubdomains) => {
      await setSubdomainsSupported(supportsSubdomains)
    }).catch(() => {
      // eslint-disable-next-line no-console
      console.error('Error checking for subdomain support')
    })
    // })()
  }
}
