/**
 * Loading page to display after clicking "Load content" button
 */

import React, { type ReactElement } from 'react'
import Header from '../components/Header.jsx'
import LoadingIndicator from '../components/loading-indicator.jsx'

export default function LoadingPage (): ReactElement {
  return (
    <>
    <Header />
    <div className="loading-page pa4-l mw7 mv5 center pa4">
      <h1 className="pa0 f3 ma0 teal tc">Loading in progress..</h1>
      <p className="mb5">Service Worker Gateway initialized, please wait while it attempts to retrieve content from IPFS peers.</p>
      <LoadingIndicator />
    </div>
    </>
  )
}
