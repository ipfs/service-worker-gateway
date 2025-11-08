import React from 'react'
import { Link } from '../components/link.jsx'
import type { ReactElement } from 'react'

export default function NoServiceWorkerErrorPage (): ReactElement {
  return (
    <main className='e2e-no-service-worker-error pa4-l bg-red mw7 mv4-l center pa4 br2 white'>
      <div className='flex items-center mb4'>
        <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='mr2'>
          <path d='m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z' />
          <line x1='12' y1='9' x2='12' y2='13' />
          <line x1='12' y1='17' x2='12.01' y2='17' />
        </svg>
        <h1 className='ma0 f3'>Warning: Service Workers Are Not Supported</h1>
      </div>
      <p>
        This page requires support for <Link href='https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API'>service workers</Link>.
      </p>
      <p>
        Please ensure that your browser has support and that it is enabled (ie. navigator.serviceWorker is present).
      </p>
      <p>
        If you are using Firefox, please note that <Link href='https://bugzilla.mozilla.org/show_bug.cgi?id=1320796'>service workers are disabled in private browsing mode</Link> - please try again in a regular browsing window.
      </p>
    </main>
  )
}
