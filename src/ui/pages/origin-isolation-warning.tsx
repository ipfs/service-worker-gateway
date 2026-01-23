import React from 'react'
import { removeRootHashIfPresent } from '../../lib/remove-root-hash.ts'
import { toGatewayRoot } from '../../lib/to-gateway-root.ts'
import './default-page-styles.css'
import { Link } from '../components/link.tsx'
import type { ReactNode } from 'react'

declare global {
  var originIsolationWarning: {
    location: string
  }
}

/**
 * Warning page to display when subdomain setup is not available
 *
 * The UI is similar to browser security warnings and informs users about
 * missing features
 */
export default function OriginIsolationWarningPage (): ReactNode {
  const location = globalThis.originIsolationWarning?.location

  if (location == null) {
    globalThis.location.href = toGatewayRoot('/')

    return (
      <></>
    )
  }

  removeRootHashIfPresent()

  return (
    <main className='e2e-subdomain-warning pa4-l bg-red mw7 mv4-l center pa4 br2 white'>
      <div className='flex items-center mb4'>
        <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='mr2'>
          <path d='m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z' />
          <line x1='12' y1='9' x2='12' y2='13' />
          <line x1='12' y1='17' x2='12.01' y2='17' />
        </svg>
        <h1 className='ma0 f3'>Warning: Subdomain Gateway Not Available</h1>
      </div>

      <div className='bg-yellow pa3 mb4 br2'>
        <p className='ma0 mb2 b'>This website is being accessed without proper origin isolation.</p>
        <p className='ma0'>
          Without origin isolation it is not safe to access IPFS content as user credentials will not be sandboxed by CID or IPNS name and can be accessed by any content that is loaded.
        </p>
      </div>

      <div>
        <span>Current Host: {window.location.host}</span>
        <p>IP addresses do not support origin isolation, please only access this page via a domain name.</p>
        <p>
          If you are the website administrator, please ensure your domain has proper DNS configuration
          for wildcard subdomains (e.g. <code>*.ipfs.DOMAIN_NAME</code> and <code>*.ipns.DOMAIN_NAME</code>).
        </p>
        <p>Further reading:</p>
        <ul>
          <li><Link href='https://en.wikipedia.org/wiki/Same-origin_policy'>Same origin policy and Web Applications</Link></li>
          <li><Link href='https://docs.ipfs.tech/how-to/address-ipfs-on-web/'>Address IPFS on the Web</Link></li>
          <li><Link href='https://github.com/ipfs/in-web-browsers/blob/master/ADDRESSING.md'>IPFS Addressing in Web Browsers</Link></li>
        </ul>
      </div>
    </main>
  )
}
