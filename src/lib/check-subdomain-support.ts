import { areSubdomainsSupported, setSubdomainsSupported } from './config-db.js'
import { isSubdomainGatewayRequest } from './path-or-subdomain.js'

/**
 * Note that this function should only be used by the UI, as it relies on the
 * loading images from the subdomain gateway to determine if subdomains are
 * supported.
 */
async function testSubdomainSupportWithImage (location: Pick<Location, 'protocol' | 'host' | 'pathname'>): Promise<boolean> {
  const testUrl = `${location.protocol}//bafkqaaa.ipfs.${location.host}/ipfs-sw-1x1.png`

  if (isSubdomainGatewayRequest(location)) {
    return true
  }

  const previousSubdomainSupportCheck = await areSubdomainsSupported()

  if (previousSubdomainSupportCheck !== null) {
    return previousSubdomainSupportCheck
  }

  return new Promise<boolean>((resolve, _reject) => {
    const img = new Image()
    img.onload = () => {
      resolve(true)
    }
    img.onerror = () => {
      resolve(false)
    }
    img.src = testUrl
  })
}

/**
 * Note that this function should only be used by the UI, as it relies on the
 * loading images from the subdomain gateway to determine if subdomains are
 * supported.
 */
export async function checkSubdomainSupport (location: Pick<Location, 'protocol' | 'host' | 'pathname'> = window.location): Promise<boolean> {
  const supportsSubdomains = await testSubdomainSupportWithImage(location)
  await setSubdomainsSupported(supportsSubdomains)
  return supportsSubdomains
}
