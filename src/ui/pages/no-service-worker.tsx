import React from 'react'
import { Link } from '../components/link.tsx'
import type { ReactElement } from 'react'

export default function NoServiceWorkerErrorPage (): ReactElement {
  return (
    <main className='e2e-no-service-worker-error pa4-l bg-red mw7 mv4-l center pa4 br2 white f4'>
      <div className='flex items-center mb4'>
        <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='mr2'>
          <path d='m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z' />
          <line x1='12' y1='9' x2='12' y2='13' />
          <line x1='12' y1='17' x2='12.01' y2='17' />
        </svg>
        <h1 className='ma0 f2'>Service Worker Required</h1>
      </div>
      <p>
        This page needs <Link href='https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API'>Service Workers</Link> to verify and load IPFS content in your browser.
      </p>
      <p>
        Please ensure that your browser has support and that it is enabled (ie. <code>navigator.serviceWorker</code> is present).
      </p>
      <p>
        To access IPFS content directly without relying on this gateway, <Link href='https://docs.ipfs.tech/install/'>install an IPFS-capable tool</Link> such as <Link href='https://docs.ipfs.tech/install/command-line/'>Kubo CLI</Link>, <Link href='https://docs.ipfs.tech/install/ipfs-desktop/'>IPFS Desktop</Link>, or the <Link href='https://docs.ipfs.tech/install/ipfs-companion/'>IPFS Companion</Link> browser extension.
      </p>
      <p>
        If you are using Firefox or Tor Browser, Service Workers are disabled in Firefox private browsing and at Tor Browser's Safer and Safest security levels (tracked in upstream tickets: <Link href='https://bugzilla.mozilla.org/show_bug.cgi?id=1320796'>mozilla#1320796</Link>, <Link href='https://gitlab.torproject.org/tpo/applications/tor-browser/-/work_items/43873'>tor-browser#43873</Link>). Until these are addressed upstream, in Firefox, retry in a regular browsing window. In Tor Browser, reach IPFS content through <Link href='https://github.com/ipfs/public-gateway-checker'>community-run Tor Onion Gateways</Link>.
      </p>
    </main>
  )
}
