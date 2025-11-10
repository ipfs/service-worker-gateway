import { Config } from './config-db.js'
import { isSubdomainGatewayRequest } from './path-or-subdomain.js'

/**
 * Note that this function should only be used by the UI, as it relies on the
 * loading images from the subdomain gateway to determine if subdomains are
 * supported.
 */
async function testSubdomainSupportWithImage (location: Pick<Location, 'protocol' | 'host' | 'pathname'>, config: Config): Promise<boolean> {
  if (isSubdomainGatewayRequest(location)) {
    return true
  }

  const previousSubdomainSupportCheck = await config.areSubdomainsSupported()

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

    // cid is empty identity hash
    img.src = `${location.protocol}//bafkqaaa.ipfs.${location.host}/ipfs-sw-1x1.png`
  })
}

/**
 * Note that this function should only be used by the UI, as it relies on
 * loading images from the subdomain gateway to determine if subdomains are
 * supported.
 */
export async function checkSubdomainSupport (location: Pick<Location, 'protocol' | 'host' | 'pathname'> = window.location, config: Config): Promise<boolean> {
  const supportsSubdomains = await testSubdomainSupportWithImage(location, config)
  await config.setSubdomainsSupported(supportsSubdomains)
  return supportsSubdomains
}
