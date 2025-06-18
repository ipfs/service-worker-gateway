/**
 * This script is injected into the ipfs-sw-first-hit.html file.
 *
 * It handles the logic for the first hit to the service worker and should only
 * ever run when _redirects file redirects to ipfs-sw-first-hit.html for /ipns
 * or /ipfs paths when the service worker is not yet intercepting requests.
 *
 * Sometimes, redirect solutions do not support redirecting directly to this page, in which case first-hit.tsx
 * will be rendered instead.
 *
 * @see https://github.com/ipfs/service-worker-gateway/issues/628
 */
// import { compressConfig, decompressConfig, getConfig, setConfig } from './lib/config-db.js'
// import { QUERY_PARAMS } from './lib/constants.js'
// import { getHeliaSwRedirectUrl } from './lib/first-hit-helpers.js'
// import { getSubdomainParts } from './lib/get-subdomain-parts.js'
// import { uiLogger } from './lib/logger.js'

// const log = uiLogger.forComponent('ipfs-sw-first-hit')

async function main (): Promise<void> {
  // log.trace('rendering')
  // // if this first hit is on a subdomain, we need to redirect to the root domain so we can get the config
  // const { parentDomain } = getSubdomainParts(window.location.href)
  // if (parentDomain != null) {
  //   // redirect to the root domain with the subdomain request query param
  //   const url = new URL(window.location.href)
  //   url.hostname = parentDomain
  //   url.pathname = '/ipfs-sw-first-hit'
  //   url.searchParams.set(QUERY_PARAMS.IPFS_SW_SUBDOMAIN_REQUEST, 'true')

  //   window.location.replace(url.toString())
  //   return
  // }

  // // Create a URL object for the current location
  // const locationUrl = new URL(window.location.href)

  // // For first-hit, we want to use the same URL for both the origin and the path
  // const redirectUrl = getHeliaSwRedirectUrl(locationUrl)

  // const newUrl = redirectUrl.toString()

  // // if we have a query param called `ipfs-sw-subdomain-request` then we need to pull the config from IDB, compress with lz-string, and redirect to the subdomain
  // if (locationUrl.searchParams.has(QUERY_PARAMS.IPFS_SW_SUBDOMAIN_REQUEST)) {
  //   try {
  //     const config = await getConfig(uiLogger)
  //     const compressedConfig = await compressConfig(config)
  //     window.location.replace(`${newUrl}?${QUERY_PARAMS.IPFS_SW_CFG}=${compressedConfig}`)
  //   } catch (err) {
  //     uiLogger.forComponent('ipfs-sw-first-hit').error('error getting compressed config for uri', err)
  //   }
  //   return
  // }
  // const compressedConfig = locationUrl.searchParams.get(QUERY_PARAMS.IPFS_SW_CFG)
  // if (compressedConfig != null) {
  //   try {
  //     const config = await decompressConfig(compressedConfig)
  //     await setConfig(config, uiLogger)
  //   } catch (err) {
  //     uiLogger.forComponent('ipfs-sw-first-hit').error('error decompressing config for uri', err)
  //   }
  // }

  // window.location.replace(newUrl)
}

void main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('helia:sw-gateway:ipfs-sw-first-hit: error rendering', err)
})
