/**
 * This script is injected into the ipfs-sw-first-hit.html file.
 *
 * It handles the logic for the first hit to the service worker.
 *
 * @see https://github.com/ipfs/service-worker-gateway/issues/628
 */
import { handleFirstHit } from './lib/first-hit-helpers.js'

handleFirstHit(window)
