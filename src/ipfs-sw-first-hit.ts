/**
 * This script is injected into the ipfs-sw-first-hit.html file.
 *
 * It handles the logic for the first hit to the service worker.
 *
 * @see https://github.com/ipfs/service-worker-gateway/issues/628
 */
import { getHeliaSwRedirectUrl } from './lib/first-hit-helpers.js'
import { isPathGatewayRequest } from './lib/path-or-subdomain.js'

// check if we should redirect to origin isolation warning page
if (isPathGatewayRequest(window.location) && !(await getOriginIsolationWarningAccepted()) && window.location.searchParams.get('helia-sw') === null) {

  window.location.href = getHeliaSwRedirectUrl(window.location.href).toString()
}
