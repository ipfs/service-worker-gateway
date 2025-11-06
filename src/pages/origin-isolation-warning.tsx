import React, { useCallback, useEffect, useState } from 'react'
import { ServiceWorkerReadyButton } from '../components/sw-ready-button.jsx'
import { ServiceWorkerProvider } from '../context/service-worker-context.jsx'
import { QUERY_PARAMS } from '../lib/constants.js'
import './default-page-styles.css'
import { toGatewayRoot } from '../lib/to-gateway-root.js'
import type { ReactNode } from 'react'

declare global {
  var originIsolationWarning: {
    location: string
  }
}

function IpAddressRecommendations ({ currentHost }: { currentHost: string }): ReactNode {
  return (
    <div>
      <span>Current Host: {currentHost}</span>
      <p>Ip addresses do not support origin isolation.</p>
      <p>If you are the website administrator, please ensure your domain has proper DNS configuration</p>
    </div>
  )
}

function DefaultRecommendations ({ currentHost }: { currentHost: string }): ReactNode {
  return (
    <div>
      <span>Current Host: {currentHost}</span>
      <p>
        For the best experience, this website should be accessed through a subdomain gateway
        (e.g., <code>cid.ipfs.{currentHost}</code> instead of <code>{currentHost}/ipfs/cid</code>).
      </p>
      <p>
        If you are the website administrator, please ensure your domain has proper DNS configuration
        for wildcard subdomains (<code>*.ipfs.{currentHost}</code> and <code>*.ipns.{currentHost}</code>).
      </p>
    </div>
  )
}

/**
 * Warning page to display when subdomain setup is not available
 *
 * The UI is similar to browser security warnings and informs users about
 * missing features
 */
export default function SubdomainWarningPage (): ReactNode {
  const location = globalThis.originIsolationWarning?.location

  if (location == null) {
    globalThis.location.href = toGatewayRoot('/')

    return (
      <></>
    )
  }

  const [acceptedRisk, setAcceptedRisk] = useState(sessionStorage.getItem('ipfs-sw-gateway-accepted-path-gateway-risk') ?? false)
  const [isSaving, setIsSaving] = useState(false)
  const originalUrl = new URL(window.location.href).searchParams.get(QUERY_PARAMS.REDIRECT)

  const handleAcceptRisk = useCallback(async () => {
    setIsSaving(true)
    // Store the user's choice in sessionStorage so it persists during the session
    sessionStorage.setItem('ipfs-sw-gateway-accepted-path-gateway-risk', 'true')
    // post to SW to accept the risk
    try {
      await fetch('?ipfs-sw-accept-origin-isolation-warning=true').then(() => {
        setAcceptedRisk(true)
      })
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error accepting risk', error)
    } finally {
      setIsSaving(false)
    }
  }, [])

  useEffect(() => {
    if (acceptedRisk) {
      window.location.href = originalUrl ?? '/'
    }
  }, [originalUrl, acceptedRisk])

  const currentHost = window.location.host

  const isCurrentHostAnIpAddress = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(currentHost)

  let RecommendationsElement: (props: { currentHost: string }) => ReactNode = DefaultRecommendations

  if (isCurrentHostAnIpAddress) {
    RecommendationsElement = IpAddressRecommendations
  }

  return (
    <ServiceWorkerProvider>
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
          <p className='ma0 mb2 b'>This website is using a path-based IPFS gateway without proper origin isolation.</p>
          <p className='ma0'>
            Without subdomain support, the following features will be missing:
          </p>
          <ul className='mt2 mb0'>
            <li>Origin isolation for security</li>
            <li>Support for _redirects functionality</li>
            <li>Proper web application functionality</li>
          </ul>
        </div>

        <RecommendationsElement currentHost={currentHost} />

        <div className='flex justify-center mt4'>
          <ServiceWorkerReadyButton id='accept-warning' label={isSaving ? 'Accepting...' : 'I understand the risks - Continue anyway'} waitingLabel='Waiting for service worker registration...' onClick={() => { void handleAcceptRisk() }} />
        </div>
      </main>
    </ServiceWorkerProvider>
  )
}
