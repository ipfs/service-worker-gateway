/**
 * This script is injected into the ipfs-sw-first-hit.html file.
 *
 * It handles the logic for the first hit to the service worker and should only
 * ever run when _redirects file redirects to ipfs-sw-first-hit.html for /ipns
 * or /ipfs paths when the service worker is not yet intercepting requests.
 *
 * @see https://github.com/ipfs/service-worker-gateway/issues/628
 */
import { getHeliaSwRedirectUrl } from './lib/first-hit-helpers.js'

// Create a URL object for the current location
const locationUrl = new URL(window.location.href)

// For first-hit, we want to use the same URL for both the origin and the path
const redirectUrl = getHeliaSwRedirectUrl(locationUrl)

const newUrl = redirectUrl.toString()

// remove the current url from the history
history.replaceState({}, '', newUrl)

// we need to redirect to the new url
window.location.href = newUrl
