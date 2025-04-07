import React, { type ReactElement } from 'react'
import { getHeliaSwRedirectUrl } from '../lib/first-hit-helpers.js'

/**
 * This is a fallback page that is rendered instead of ipfs-sw-first-hit.html.
 *
 * Ideally, this page would not be loaded, because it comes with all the JS and CSS for the React side of things, but we
 * still need to redirect to the correct URL for SW registration and loading any desired content.
 *
 * The actual URL will be something like `https://example.com/ipfs-sw-first-hit.html/ipfs/QmHash?potentialQueryParam=potentialQueryValue`
 * and we want to call `getHeliaSwRedirectUrl` with the current URL (except the ipfs-sw-first-hit.html part) to get the actual URL.
 */
export default (): ReactElement => {
  // get the current URL
  const currentUrl = new URL(window.location.href)

  currentUrl.pathname = currentUrl.pathname.replace('/ipfs-sw-first-hit.html', '')
  // call getHeliaSwRedirectUrl with the remaining URL
  const redirectUrl = getHeliaSwRedirectUrl(currentUrl)

  // eslint-disable-next-line no-console
  console.log('redirecting to', redirectUrl)

  history.replaceState({}, '', redirectUrl.toString())
  // redirect to the actual URL
  window.location.href = redirectUrl.toString()

  return (
    <div>First Hit. This page should not be visible</div>
  )
}
