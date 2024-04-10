import React, { Suspense } from 'react'
// import Config from './components/config.jsx'
// import Header from './components/Header'
// import { ConfigContext } from './context/config-context.jsx'
// import HelperUi from './helper-ui.jsx'
import { RouteContext } from './context/router-context.jsx'
// import { isConfigPage } from './lib/is-config-page.js'
// import { isPathOrSubdomainRequest, isSubdomainGatewayRequest } from './lib/path-or-subdomain.js'
// import type { Route } from './lib/simple-router.js'
// import RedirectPage from './redirectPage.jsx'

// const LazyConfig = React.lazy(async () => import('./pages/config.jsx'))
// const LazyHelperUi = React.lazy(async () => import('./helper-ui.jsx'))
// const LazyRedirectPage = React.lazy(async () => import('./pages/redirect-page.jsx'))

// const routes: Route[] = [
//   { path: '#/ipfs-sw-config', component: LazyConfig }
//   // { path: '/about', component: AboutPage },
// ]

function App (): JSX.Element {
  // const { isConfigExpanded, setConfigExpanded } = useContext(ConfigContext)

  const { currentRoute } = React.useContext(RouteContext)
  // const isRequestToViewConfigPage = isConfigPage(window.location.hash)
  // const isSubdomainRender = isSubdomainGatewayRequest(window.location)
  // const shouldRequestBeHandledByServiceWorker = isPathOrSubdomainRequest(window.location) && !isRequestToViewConfigPage

  // let UiToRender: typeof LazyConfig | typeof LazyHelperUi | typeof LazyRedirectPage = LazyHelperUi
  // const props: any = {}
  // let renderHeader = true
  // if (shouldRequestBeHandledByServiceWorker) {
  //   renderHeader = false
  //   if (window.self === window.top && isSubdomainRender) {
  //     // return (<RedirectPage />)
  //     UiToRender = LazyRedirectPage
  //   } else {
  //     // rendering redirect page without iframe because this is a top level window and subdomain request.
  //     // return (<RedirectPage showConfigIframe={false} />)
  //     UiToRender = LazyRedirectPage
  //     props.showConfigIframe = false
  //   }
  // } else {
  //   if (isRequestToViewConfigPage) {
  //     if (isSubdomainRender && window.self === window.top) {
  //     // return <RedirectPage />
  //       UiToRender = LazyRedirectPage
  //     }

  //     // setConfigExpanded(true)
  //     // return <Config />
  //     UiToRender = LazyConfig
  //   }
  // }

  // if (isSubdomainRender) {
  //   // return (<RedirectPage />)
  //   UiToRender = LazyRedirectPage
  // }

  // if (isConfigExpanded) {
  //   // return (<Config />)
  //   UiToRender = LazyConfig
  // }
  // return (
  //   <HelperUi />
  // )

  // eslint-disable-next-line no-console
  console.log('currentRoute', currentRoute)
  return (
    <>
    {/* // <RouterProvider routes={routes}> */}
      {/* {renderHeader && <Header/>} */}
      <Suspense fallback={<div>Loading...</div>}>
        {currentRoute?.component != null && <currentRoute.component />}
      </Suspense>
    {/* // </RouterProvider> */}
    </>
  )
}

export default App
