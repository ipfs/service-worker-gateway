import type React from 'react'

export interface Route {
  default?: boolean
  path?: string
  render?(): Promise<boolean>
  component: React.LazyExoticComponent<(...args: any[]) => React.JSX.Element | null>
}

export class SimpleRouter {
  private readonly routes: Route[]
  public currentRoute: Route | undefined
  /**
   * The default route is the first route in the list of routes,
   * or the first one with the `default` property set to `true`
   */
  private readonly defaultRoute: Route

  constructor (routes: Route[]) {
    this.routes = routes

    this.defaultRoute = this.routes.find(route => route.default) ?? this.routes[0]
    if (this.defaultRoute == null) {
      throw new Error('No default route found')
    }
    this.#setCurrentRoute(this.defaultRoute)

    // window.onpopstate = this.onPopState.bind(this)
    // window.onhashchange = this.onHashChange.bind(this)
    window.addEventListener('popstate', this.#onPopState.bind(this), false)
    window.addEventListener('hashchange', this.#onHashChange.bind(this), false)
    // window.addEventListener('popstate', this.#onNavigationEvent.bind(this))
    // window.addEventListener('hashchange', this.#onNavigationEvent.bind(this))
  }

  #findRouteByPath (path: string): Route | undefined {
    return this.routes.find(route => route.path === path)
  }

  #findRoutesByStateCheck (): Route | undefined {
    // loop through all async routes.render methods and return the first one that returns true
    return this.routes.find(async route => await route.render?.() ?? false)
  }

  // #onNavigationEvent (event: PopStateEvent | HashChangeEvent): void {
  //   // eslint-disable-next-line no-console
  //   console.log('navigation event', event)
  //   this.#setCurrentRoute(this.#findRouteByPath(window.location.hash) ?? this.#findRoutesByStateCheck() ?? this.defaultRoute)
  // }

  /**
   * should be triggered only by calling `gotoPage`
   */
  #onHashChange (event: HashChangeEvent): void {
    // eslint-disable-next-line no-console
    console.log('hashchange event', event)
    // window.location.reload()
    const newUrl = new URL(event.newURL)

    this.#setCurrentRoute(this.#findRouteByPath(newUrl.hash) ?? this.#findRoutesByStateCheck() ?? this.defaultRoute)
  }

  /**
   * triggered when user moves forward/backward in browser
   */
  #onPopState (event: PopStateEvent): void {
    // eslint-disable-next-line no-console
    console.log('popstate event', event)

    this.#setCurrentRoute(this.#findRouteByPath(window.location.hash) ?? this.#findRoutesByStateCheck() ?? this.defaultRoute)
  }

  /**
   * Only called by onPopState or onHashChange
   */
  #setCurrentRoute (route: Route): void {
    this.currentRoute = route
  }

  /**
   * Triggers hashchange event
   */
  gotoPage (page: string): void {
    window.location.hash = `#${page}`
  }
}
