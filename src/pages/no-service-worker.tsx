/**
 * Page to display a user friendly message when `navigator.serviceWorker` is not available.
 */

import React from 'react'
import { Link } from '../components/link.jsx'
import '../default-page-styles.css'
import type { ReactElement } from 'react'

export default function NoServiceWorkerErrorPage (): ReactElement {
  return (
    <>
      <main className='pa4-l bg-red-muted mw7 mb5 center pa4 e2e-no-service-worker-error'>
        <h1>Service Worker Error</h1>
        <p>
          This page requires a service worker to be available. Please ensure that
          your browser supports service workers and that they are enabled
          (navigator.serviceWorker is present).
        </p>
        <p>
          If you are using Firefox, please note that
          <Link href='https://bugzilla.mozilla.org/show_bug.cgi?id=1320796'>service workers are disabled in private browsing mode</Link>.
          Please try again in a regular browsing window.
        </p>
      </main>
    </>
  )
}
