/**
 * This script is injected into the ipfs-sw-first-hit.html file.
 *
 * It handles the logic for the first hit to the service worker.
 *
 * @see https://github.com/ipfs/service-worker-gateway/issues/628
 */
import { getHeliaSwRedirectUrl } from './lib/first-hit-helpers.js'

const redirectUrl = getHeliaSwRedirectUrl(new URL(window.location.href), new URL(window.location.href))

const newUrl = redirectUrl.toString()

// remove the current url from the history
history.replaceState({}, '', newUrl)

// we need to redirect to the new url
window.location.href = newUrl
