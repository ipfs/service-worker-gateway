/**
 * This script is injected into the ipfs-sw-first-hit.html file.
 *
 * It handles the logic for the first hit to the service worker.
 *
 * @see https://github.com/ipfs/service-worker-gateway/issues/628
 */

const handleFirstHit = (): void => {
  const url = new URL(window.location.href)
  const path = url.pathname
  const query = url.searchParams
  const redirectUrl = new URL('', window.location.origin)

  // we need to redirect to ?helia-sw=<path> and preserve any query parameters
  redirectUrl.searchParams.set('helia-sw', path)
  query.forEach((value, key) => {
    redirectUrl.searchParams.set(key, value)
  })

  // eslint-disable-next-line no-console
  console.log('redirectUrl', redirectUrl.toString())

  // we should remove the history of the redirect to this page
  // history.replaceState({}, '', redirectUrl.toString())
  // remove the current url from the history
  history.replaceState({}, '', redirectUrl.toString())

  // we need to redirect to the new url
  window.location.href = redirectUrl.toString()
}

handleFirstHit()
