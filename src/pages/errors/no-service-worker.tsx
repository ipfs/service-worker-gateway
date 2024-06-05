/**
 * Page to display a user friendly message when `navigator.serviceWorker` is not available.
 */

import React from 'react'
import About from '../../components/About.jsx'
import Header from '../../components/Header.jsx'
import '../default-page-styles.css'

export default function NoServiceWorkerErrorPage (): React.JSX.Element {
  return (
    <>
      <Header />
      <main className='pa4-l bg-red-muted mw7 mt1 mb5 center pa4'>
        <h1>Service Worker Error</h1>
        <p>
          This page requires a service worker to be available. Please enable
          service workers in your browser and try again.
        </p>
      </main>
      <About />
    </>
  )
}
