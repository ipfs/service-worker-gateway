/**
 * Loading page to display after clicking "Load content" button
 */

import React from 'react'

export default function LoadingPage (): React.JSX.Element {
  return (
    <div className="loading-page pa4-l mw7 mv5 center pa4">
      <h3>Service Worker initialized, please wait while it attempts to retrieve content from IPFS peers</h3>
    </div>
  )
}
