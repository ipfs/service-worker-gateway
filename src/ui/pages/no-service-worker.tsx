import React from 'react'
import { Link } from '../components/link.tsx'
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
        <h1 className='ma0 f3'>Service Worker Required</h1>
      </div>
      <p>
        This gateway uses a <Link href='https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API'>Service Worker</Link> to verify and load IPFS content in your browser, but your browser does not have one available.
      </p>
      <p>
        This is most common in Tor Browser, which is <Link href='https://gitlab.torproject.org/tpo/applications/tor-browser/-/work_items/43873'>work-in-progress</Link>. To reach IPFS content there, use a <Link href='https://ipfs.github.io/public-gateway-checker/'>community-run Onion gateway</Link> instead.
      </p>
    </main>
  )
}
