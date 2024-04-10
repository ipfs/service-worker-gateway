import React, { useCallback, useEffect } from 'preact/compat'

export interface Route {
  default?: boolean
  path?: string
  shouldRender?(): Promise<boolean>
  component(...args: any[]): React.JSX.Element | null
}

export const RouteContext = React.createContext<{
  // routes: Route[]
  currentRoute: Route | undefined
  gotoPage(route?: string): void
}>({ currentRoute: undefined, gotoPage: () => {} })

export const RouterProvider = ({ children, routes }: { children: React.ReactNode, routes: Route[] }): React.JSX.Element => {
  const [currentRoute, setCurrentRoute] = React.useState<Route | undefined>(undefined)
  /**
   * The default route is the first route in the list of routes,
   * or the first one with the `default` property set to `true`
   */
  const defaultRoute = routes.find(route => route.default) ?? routes[0]

  const findRouteByPath = useCallback((path: string): Route | undefined => {
    const result = routes.find(route => route.path === path)
    return result
  }, [routes])

  const findRouteByRenderFn = useCallback(async (): Promise<Route | undefined> => {
    const validRoutes: Route[] = []
    for (const route of routes) {
      if (route.shouldRender == null) {
        continue
      }
      const renderFuncResult = await route.shouldRender()

      if (renderFuncResult) {
        validRoutes.push(route)
      }
    }
    return validRoutes[0] ?? undefined
  }, [routes])

  const setDerivedRoute = useCallback(async (hash: string): Promise<void> => {
    setCurrentRoute(findRouteByPath(hash) ?? await findRouteByRenderFn() ?? defaultRoute)
  }, [findRouteByPath, findRouteByRenderFn, defaultRoute])

  const onHashChange = useCallback((event: HashChangeEvent) => {
    const newUrl = new URL(event.newURL)
    void setDerivedRoute(newUrl.hash)
  }, [setDerivedRoute])

  const onPopState = useCallback((event: PopStateEvent) => {
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
        gotoPage: (page?: string) => {
          if (page == null) {
            // clear out the hash
            window.history.pushState('', document.title, `${window.location.pathname}${window.location.search}`)
            void setDerivedRoute('')
          } else {
            window.location.hash = `#${page}`
          }
        }
      }}
    >
      {children}
    </RouteContext.Provider>
  )
}
