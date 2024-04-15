export async function shouldRenderRedirectPage (): Promise<boolean> {
  const { isConfigPage } = await import('../lib/is-config-page.js')
  const { isPathOrSubdomainRequest } = await import('./path-or-subdomain.js')
  const isRequestToViewConfigPage = isConfigPage(window.location.hash)
  const shouldRequestBeHandledByServiceWorker = isPathOrSubdomainRequest(window.location) && !isRequestToViewConfigPage
  const isTopLevelWindow = window.self === window.top
  const isRequestToViewConfigPageAndTopLevelWindow = isRequestToViewConfigPage && isTopLevelWindow
  const result = shouldRequestBeHandledByServiceWorker && !isRequestToViewConfigPageAndTopLevelWindow
  return result
}

export async function shouldRenderConfigPage (): Promise<boolean> {
  const { isConfigPage } = await import('../lib/is-config-page.js')

  const isRequestToViewConfigPage = isConfigPage(window.location.hash)
  return isRequestToViewConfigPage
}

export async function shouldRenderRedirectsInterstitial (): Promise<boolean> {
  const url = new URL(window.location.href)
  const heliaSw = url.searchParams.get('helia-sw')
  return heliaSw != null
}
