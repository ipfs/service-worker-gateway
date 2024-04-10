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
  /**
   * The default route is the first route in the list of routes,
   * or the first one with the `default` property set to `true`
   */
  const defaultRoute = routes.find(route => route.default) ?? routes[0]

  const findRouteByPath = useCallback((path: string): Route | undefined => {
    return routes.find(route => route.path === path)
  }, [routes])

  const findRouteByRenderFn = useCallback((): Route | undefined => {
    return routes.find(async route => await route.render?.() ?? false)
  }, [routes])

  const getDerivedRoute = useCallback((hash: string): Route => {
    return findRouteByPath(hash) ?? findRouteByRenderFn() ?? defaultRoute
  }, [findRouteByPath, findRouteByRenderFn, defaultRoute])
  const [currentRoute, setCurrentRoute] = React.useState(getDerivedRoute(window.location.hash))

  const onHashChange = useCallback((event: HashChangeEvent) => {
    // eslint-disable-next-line no-console
    console.log('hashchange event', event)
    const newUrl = new URL(event.newURL)
    setCurrentRoute(getDerivedRoute(newUrl.hash))
  }, [getDerivedRoute])

  const onPopState = useCallback((event: PopStateEvent) => {
    // eslint-disable-next-line no-console
    console.log('popstate event', event)
    // const newUrl = new URL(event.newURL)
    setCurrentRoute(getDerivedRoute(window.location.hash))
  }, [getDerivedRoute])

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
