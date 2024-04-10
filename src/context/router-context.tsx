import React, { useCallback, useEffect } from 'react'

export interface Route {
  default?: boolean
  path?: string
  render?(): Promise<boolean>
  component: React.LazyExoticComponent<(...args: any[]) => React.JSX.Element | null>
}

export const RouteContext = React.createContext<{
  // routes: Route[]
  currentRoute: Route | undefined
  gotoPage(route: string): void
}>({ currentRoute: undefined, gotoPage: () => {} })

export const RouterProvider = ({ children, routes }: { children: React.ReactNode, routes: Route[] }): JSX.Element => {
  // eslint-disable-next-line no-console
  console.log('RouterProvider routes:', routes)
  const [currentRoute, setCurrentRoute] = React.useState<Route | undefined>(undefined)
  /**
   * The default route is the first route in the list of routes,
   * or the first one with the `default` property set to `true`
   */
  const defaultRoute = routes.find(route => route.default) ?? routes[0]

  const findRouteByPath = useCallback((path: string): Route | undefined => {
    // eslint-disable-next-line no-console
    console.log('finding route by path', path)
    const result = routes.find(route => route.path === path)
    // eslint-disable-next-line no-console
    console.log('got result', result)
    return result
  }, [routes])

  const findRouteByRenderFn = useCallback(async (): Promise<Route | undefined> => {
    // eslint-disable-next-line no-console
    console.group('finding route by renderFn')
    const validRoutes: Route[] = []
    for (const route of routes) {
      // eslint-disable-next-line no-console
      console.log('checking route', route)
      if (route.render == null) {
        // eslint-disable-next-line no-console
        console.log('route has no render function')
        continue
      }
      const renderFuncResult = await route.render()
      // eslint-disable-next-line no-console
      console.log('got renderFuncResult', renderFuncResult)

      if (renderFuncResult) {
        validRoutes.push(route)
      }
    }
    // eslint-disable-next-line no-console
    console.log('got validRoutes', validRoutes)
    // eslint-disable-next-line no-console
    console.groupEnd()
    return validRoutes[0] ?? undefined
  }, [routes])

  const setDerivedRoute = useCallback(async (hash: string): Promise<void> => {
    setCurrentRoute(findRouteByPath(hash) ?? await findRouteByRenderFn() ?? defaultRoute)
  }, [findRouteByPath, findRouteByRenderFn, defaultRoute])

  const onHashChange = useCallback((event: HashChangeEvent) => {
    // eslint-disable-next-line no-console
    console.log('hashchange event', event)
    const newUrl = new URL(event.newURL)
    // void getDerivedRoute(newUrl.hash).then((route) => { setCurrentRoute(route) })
    void setDerivedRoute(newUrl.hash)
  }, [setDerivedRoute])

  const onPopState = useCallback((event: PopStateEvent) => {
    // eslint-disable-next-line no-console
    console.log('popstate event', event)
    // const newUrl = new URL(event.newURL)
    // setCurrentRoute(await getDerivedRoute(window.location.hash))

    // void getDerivedRoute(window.location.hash).then((route) => { setCurrentRoute(route) })
    void setDerivedRoute(window.location.hash)
  }, [setDerivedRoute])

  useEffect(() => {
    void setDerivedRoute(window.location.hash)
  }, [setDerivedRoute])

  useEffect(() => {
    window.addEventListener('popstate', onPopState, false)
    window.addEventListener('hashchange', onHashChange, false)

    return () => {
      window.removeEventListener('popstate', onPopState, false)
      window.removeEventListener('hashchange', onHashChange, false)
    }
  }, [onPopState, onHashChange])

  return (
    <RouteContext.Provider
      value={{
        currentRoute,
        gotoPage: (page: string) => {
          window.location.hash = `#${page}`
        }
      }}
    >
      {children}
    </RouteContext.Provider>
  )
}
