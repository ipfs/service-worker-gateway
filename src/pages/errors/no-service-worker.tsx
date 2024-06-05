/**
 * Page to display a user friendly message when `navigator.serviceWorker` is not available.
 */

import React from 'react'

export default function NoServiceWorkerErrorPage (): React.JSX.Element {
  return (
    <div>
      <h1>Service Worker Error</h1>
      <p>
        This page requires a service worker to be available. Please enable
        service workers in your browser and try again.
      </p>
    </div>
  )
}
