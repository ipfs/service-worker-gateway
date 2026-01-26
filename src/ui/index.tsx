import React from 'react'
import ReactDOMClient from 'react-dom/client'
import './index.css'
import { FaInfoCircle, FaGithub, FaExclamationTriangle, FaExclamationCircle, FaHome, FaListAlt } from 'react-icons/fa'
import { HashRouter, Route, Routes, NavLink } from 'react-router-dom'
import { HASH_FRAGMENTS } from '../lib/constants.ts'
import { injectCSS } from '../lib/css-injector.ts'
import { ErrorBoundary } from './components/error-boundary.tsx'
import ipfsLogo from './ipfs-logo.svg'
import AboutPage from './pages/about.tsx'
import { FetchErrorPage } from './pages/fetch-error.tsx'
import HomePage from './pages/home.tsx'
import NoServiceWorkerErrorPage from './pages/no-service-worker.tsx'
import OriginIsolationWarningPage from './pages/origin-isolation-warning.tsx'
import { RenderEntityPage } from './pages/render-entity.tsx'
import { ServerErrorPage } from './pages/server-error.tsx'

// SW did not trigger for this request

function toAbsolutePath (path: string): string {
  if (path.startsWith('./')) {
    return path.substring(1)
  }

  return path
}

/**
 * Do not redirect to `#/` if we are already on the bare domain, otherwise the
 * hash can interfere with CTRL+R-style page reloads
 */
function doNothingIfClickedOnRoot (event: React.MouseEvent): boolean {
  if (globalThis.location.hash === '') {
    event.preventDefault()
    event.stopPropagation()
    return false
  }

  return true
}

function Header (): React.ReactElement {
  let errorPageLink: React.ReactElement | undefined

  if (globalThis.fetchError != null) {
    errorPageLink = (
      <NavLink to='/' className={({ isActive }) => (isActive || globalThis.location.hash === '') ? 'yellow-muted' : 'yellow'} onClickCapture={doNothingIfClickedOnRoot}>
        <FaExclamationCircle className='ml2 f3' />
      </NavLink>
    )
  }

  if (globalThis.serverError != null) {
    errorPageLink = (
      <NavLink to='/' className={({ isActive }) => (isActive || globalThis.location.hash === '') ? 'red-muted' : 'red'} onClickCapture={doNothingIfClickedOnRoot}>
        <FaExclamationCircle className='ml2 f3' />
      </NavLink>
    )
  }

  if (globalThis.originIsolationWarning != null) {
    errorPageLink = (
      <NavLink to='/' className={({ isActive }) => (isActive || globalThis.location.hash === '') ? 'yellow-muted' : 'yellow'} onClickCapture={doNothingIfClickedOnRoot}>
        <FaExclamationTriangle className='ml2 f3' />
      </NavLink>
    )
  }

  if (globalThis.renderEntity != null) {
    errorPageLink = (
      <NavLink to='/' className={({ isActive }) => (isActive || globalThis.location.hash === '') ? 'white' : 'aqua'} onClickCapture={doNothingIfClickedOnRoot}>
        <FaListAlt className='ml2 f3' />
      </NavLink>
    )
  }

  return (
    <header className='e2e-header flex items-center pa2 bg-navy bb bw3 b--aqua tc justify-between'>
      <div>
        <a href='https://ipfs.tech' title='IPFS Project' target='_blank' rel='noopener noreferrer' aria-label='Visit the website of the IPFS Project'>
          <img alt='IPFS logo' src={toAbsolutePath(ipfsLogo)} style={{ height: 50 }} className='v-top' />
        </a>
      </div>
      <div className='pb1 ma0 mr2 inline-flex items-center aqua'>
        <h1 className='e2e-header-title f3 fw2 ttu sans-serif'>Service Worker Gateway</h1>
        {errorPageLink}
        <NavLink id='e2e-link-home-page' to={`/${HASH_FRAGMENTS.IPFS_SW_LOAD_UI}`} className={({ isActive }) => (isActive || (errorPageLink == null && globalThis.location.hash === '')) ? 'white' : 'aqua'}>
          <FaHome className='ml2 f3' />
        </NavLink>
        <NavLink id='e2e-link-about-page' to={`/${HASH_FRAGMENTS.IPFS_SW_ABOUT_UI}`} className={({ isActive }) => isActive ? 'white' : 'aqua'}>
          <FaInfoCircle className='ml2 f3' />
        </NavLink>
        <a href='https://github.com/ipfs/service-worker-gateway' className='aqua' title='IPFS Service Worker Gateway on GitHub' target='_blank' rel='noopener noreferrer' aria-label='Visit the GitHub repository for the IPFS Service Worker Gateway'>
          <FaGithub className='ml2 f3' />
        </a>
      </div>
    </header>
  )
}

/**
 * Dynamically create an index route - if an error has occurred, show that on
 * the landing page, otherwise show the "Enter a CID" UI page
 */
function getIndexRoute (): React.ReactElement {
  if (globalThis.fetchError != null && globalThis.location.hash === '') {
    return (
      <Route element={<FetchErrorPage />} index />
    )
  }

  if (globalThis.serverError != null && globalThis.location.hash === '') {
    return (
      <Route element={<ServerErrorPage />} index />
    )
  }

  if (globalThis.originIsolationWarning != null && globalThis.location.hash === '') {
    return (
      <Route element={<OriginIsolationWarningPage />} index />
    )
  }

  if (globalThis.renderEntity != null && globalThis.location.hash === '') {
    return (
      <Route element={<RenderEntityPage />} index />
    )
  }

  return (
    <Route element={<HomePage />} index />
  )
}

/**
 * This component is used when either:
 *
 * 1. the SW encountered an error fulfilling the request
 * 2. Installing the service worker failed
 * 3. The user wants to update the service worker config
 * 4. The user needs to accept the origin isolation warning
 */
function App (): React.ReactElement {
  return (
    <HashRouter>
      <Header />
      <ErrorBoundary>
        <Routes>
          {getIndexRoute()}
          <Route path={`/${HASH_FRAGMENTS.IPFS_SW_LOAD_UI}`} element={<HomePage />} />,
          <Route path={`/${HASH_FRAGMENTS.IPFS_SW_ABOUT_UI}`} element={<AboutPage />} />,
          <Route path={`/${HASH_FRAGMENTS.IPFS_SW_FETCH_ERROR_UI}`} element={<FetchErrorPage />} />
          <Route path={`/${HASH_FRAGMENTS.IPFS_SW_SERVER_ERROR_UI}`} element={<ServerErrorPage />} />
          <Route path={`/${HASH_FRAGMENTS.IPFS_SW_ORIGIN_ISOLATION_WARNING}`} element={<OriginIsolationWarningPage />} />
        </Routes>
      </ErrorBoundary>
    </HashRouter>
  )
}

async function renderUi (): Promise<void> {
  try {
    // @ts-expect-error - css config is generated at build time
    // eslint-disable-next-line import-x/no-absolute-path
    const { CSS_FILENAME } = await import('/ipfs-sw-css-config.js')
    injectCSS(CSS_FILENAME)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('Failed to load CSS config, UI will render without styles:', err)
  }

  const loadingIndicator = document.querySelector('.loading-indicator-js')

  if (loadingIndicator != null) {
    loadingIndicator.classList.add('hidden')
  }

  const container = document.getElementById('root')

  if (container == null) {
    throw new Error('No root container found')
  }

  const root = ReactDOMClient.createRoot(container)

  if (!('serviceWorker' in navigator)) {
    root.render(
      <React.StrictMode>
        <header className='e2e-header flex items-center pa2 bg-navy bb bw3 b--aqua tc justify-between'>
          <div>
            <a href='https://ipfs.tech' title='IPFS Project' target='_blank' rel='noopener noreferrer' aria-label='Visit the website of the IPFS Project'>
              <img alt='IPFS logo' src={toAbsolutePath(ipfsLogo)} style={{ height: 50 }} className='v-top' />
            </a>
          </div>
          <div className='pb1 ma0 mr2 inline-flex items-center aqua'>
            <h1 className='e2e-header-title f3 fw2 ttu sans-serif'>Service Worker Gateway</h1>
            <a href='https://github.com/ipfs/service-worker-gateway' title='IPFS Service Worker Gateway on GitHub' target='_blank' rel='noopener noreferrer' aria-label='Visit the GitHub repository for the IPFS Service Worker Gateway'>
              <FaGithub className='ml2 f3' />
            </a>
          </div>
        </header>
        <NoServiceWorkerErrorPage />
      </React.StrictMode>
    )

    return
  }

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

renderUi().catch(err => {
  // eslint-disable-next-line no-console
  console.error('Failed to render UI:', err)
})
