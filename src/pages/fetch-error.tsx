import React, { useState } from 'react'
import { Button } from '../button.jsx'
import ContentBox from '../components/content-box.jsx'
import { Link } from '../components/link.jsx'
import Terminal from '../components/terminal.jsx'
import { HASH_FRAGMENTS } from '../lib/constants.js'
import { toGatewayRoot } from '../lib/to-gateway-root.js'
import type { ConfigDb } from '../lib/config-db.js'
import type { RequestDetails, ResponseDetails } from '../sw/fetch-error-page.js'
import type { ReactElement } from 'react'

declare global {
  var fetchError: {
    request: RequestDetails
    response: ResponseDetails
    config: ConfigDb
    providers: Providers
    title: string
    logs: string[]
  }
}

function capitalizeHeader (key: string): string {
  return key.split('-').map(s => `${s.substring(0, 1).toUpperCase()}${s.substring(1)}`).join('-')
}

function toRequest (request: RequestDetails): string {
  const url = new URL(request.resource)
  const headers = [
    `Host: ${url.host}`
  ]

  for (const [key, value] of new Headers(request.headers ?? {}).entries()) {
    headers.push(`${capitalizeHeader(key)}: ${value}`)
  }

  return `${request.method ?? 'GET'} ${url.pathname} HTTP/1.1
${
  headers.join('\n')
}`
}

function toResponse (response: any): string {
  let body = response.body

  // try to make JSON body legible
  if (response?.headers['content-type']?.includes('application/json')) {
    try {
      body = JSON.stringify(JSON.parse(response.body), null, 2)
    } catch {}
  }

  return `HTTP/1.1 ${response.status} ${response.statusText}
${
  [...Object.entries(response.headers)].map(([key, value]) => `${capitalizeHeader(key)}: ${value}`).join('\n')
}

${body}`
}

function findCid (request: any): string | void {
  try {
    const url = new URL(request.resource)

    const [cid] = url.hostname.split('.ipfs.')

    if (cid != null) {
      return cid
    }

    const path = url.pathname.split('/')

    if (path.length > 2 && path[1] === 'ipfs') {
      return path[2]
    }
  } catch {}
}

export interface Providers {
  total: number
  bitswap: Record<string, string[]>
  trustlessGateway: string[]

  // this is limited to 5x entries to prevent new routing systems causing OOMs
  other: any[]
  otherCount: number
}

export interface FetchErrorPageProps {
  request?: RequestDetails
  response?: ResponseDetails
  config?: Record<string, any>
  logs?: string[]
  providers?: Providers
}

function DebugInfo ({ request, response, config, logs }: FetchErrorPageProps): ReactElement {
  let requestDisplay = <></>

  if (request != null) {
    requestDisplay = (
      <>
        <h4>Request</h4>
        <Terminal>{toRequest(request)}</Terminal>
      </>
    )
  }

  let responseDisplay = <></>

  if (response != null) {
    responseDisplay = (
      <>
        <h4>Response</h4>
        <Terminal>{toResponse(response)}</Terminal>
      </>
    )
  }

  let configDisplay = <></>

  if (config != null) {
    configDisplay = (
      <>
        <h4>Configuration</h4>
        <Terminal>{JSON.stringify(config, null, 2)}</Terminal>
      </>
    )
  }

  let logDisplay = <></>

  if (logs != null) {
    logDisplay = (
      <>
        <h4>Logs</h4>
        <Terminal>{logs.join('\n')}</Terminal>
      </>
    )
  }

  return (
    <>
      <h3>Debug</h3>
      {/* this message is already displayed if it's a 500 */}
      {response?.status === 500 ? '' : <p>If you open a <Link href='https://github.com/ipfs/service-worker-gateway/issues?q=sort%3Aupdated-desc+is%3Aissue+is%3Aopen'>bug report</Link> please include all of the information below.</p>}
      {requestDisplay}
      {responseDisplay}
      {configDisplay}
      {logDisplay}
    </>
  )
}

export function FetchErrorPage ({ request, response, config, logs, providers }: FetchErrorPageProps): ReactElement {
  request = request ?? globalThis.fetchError?.request
  response = response ?? globalThis.fetchError?.response
  config = config ?? globalThis.fetchError?.config
  logs = logs ?? globalThis.fetchError?.logs
  providers = providers ?? globalThis.fetchError?.providers

  if (request == null || response == null || config == null || logs == null || providers == null) {
    globalThis.location.href = toGatewayRoot('/')

    return (
      <></>
    )
  }

  const defaultShowDebugInfo = response.status === 500

  let showDebugInfo = defaultShowDebugInfo
  let setShowDebugInfo = (val: boolean): void => {}

  try {
    [showDebugInfo, setShowDebugInfo] = useState<boolean>(defaultShowDebugInfo)
  } catch {
    // useState breaks during the initial server-side renderToString call as it
    // seems to break hooks - https://github.com/facebook/react/issues/22214
  }

  function toggleDebugInfo (): void {
    setShowDebugInfo(!showDebugInfo)
  }

  function retry (): void {
    // remove any UI-added navigation info
    history.pushState('', document.title, window.location.pathname + window.location.search)

    // @ts-expect-error boolean `forceGet` argument is firefox-only
    window.location.reload(true)
  }

  function goBack (): void {
    window.history.back()
  }

  function checkAvailability (cid: string): void {
    window.open(`https://check.ipfs.network/?cid=${cid}`)
  }

  const cid = findCid(request)

  const openIssueLink = (
    <>
      <p className='f5 ma0 pt3 teal fw4 db'>Please <Link href='https://github.com/ipfs/service-worker-gateway/issues'>open an issue</Link> with the URL you tried to access and any debugging information displayed below.</p>
    </>
  )

  let message = (
    <>
      <p className='f5 ma0 pt3 teal fw4 db'>An error occurred in the service worker gateway.</p>
      {openIssueLink}
    </>
  )

  if (response.status === 501) {
    message = (
      <>
        <p className='f5 ma0 pt3 teal fw4 db'>This gateway encountered content it did not know how to handle.</p>
        {openIssueLink}
      </>
    )
  } else if (response.status === 502) {
    message = (
      <>
        <p className='f5 ma0 pt3 teal fw4 db'>'This gateway failed to load the requested content.'</p>
      </>
    )
  } else if (response.status === 504) {
    let providersMessage = <></>

    if (providers.total === 0) {
      providersMessage = (
        <>
          <Terminal>No providers were found</Terminal>
        </>
      )
    } else {
      const bitswapProviders: Array<{ PeerID: string, Multiaddrs: string[] }> = []
      const trustlessGatewayProviders: string[] = providers.trustlessGateway
      const unknownProviders: any[] = providers.other

      Object.entries(providers.bitswap).forEach(([PeerID, Multiaddrs]) => {
        bitswapProviders.push({
          PeerID,
          Multiaddrs
        })
      })

      providersMessage = (
        <>
          <Terminal>
            These providers were found but did not return the requested data within the timeout:
            {bitswapProviders.length > 0 ? '\n\nBitswap:\n\n' + JSON.stringify(bitswapProviders, null, 2) : ''}
            {trustlessGatewayProviders.length > 0 ? '\n\nTrustless Gateways:\n\n' + JSON.stringify(trustlessGatewayProviders, null, 2) : ''}
            {unknownProviders.length > 0 ? `\n\nUnknown Routing(s) (${providers.other.length}/${providers.otherCount}):\n\n` + JSON.stringify(unknownProviders, null, 2) : ''}
          </Terminal>
        </>
      )
    }

    message = (
      <>
        <p className='charcoal f6 fw1 db pt1 lh-copy mb2'>The <Link href='https://docs.ipfs.tech/concepts/glossary/#gateway'>gateway</Link> is taking too long to fetch your content from the <Link href='https://docs.ipfs.tech/concepts/glossary/#mainnet'>public IPFS network</Link>.</p>
        {providersMessage}
        <p className='f5 ma0 pt3 teal fw4 db'>How you can proceed:</p>
        <ul className='charcoal f6 fw1 db pt1 lh-copy mb2'>
          <li>Verify the URL and try again.</li>
          <li>Self-host and run an <Link href='https://docs.ipfs.tech/concepts/ipfs-implementations/'>IPFS client</Link> that verifies your data.</li>
          <li>Try diagnosing your request with the <Link href='https://docs.ipfs.tech/reference/diagnostic-tools/'>IPFS diagnostic tools</Link>.</li>
          <li>Inspect the <Link href={`https://cid.ipfs.tech/${cid ? `#${cid}` : ''}`}>CID</Link> or <Link href={`https://explore.ipld.io/${cid ? `#/explore/${cid}` : ''}`}>DAG</Link>.</li>
          <li>Increase the timeout in the <Link href={`/#/${HASH_FRAGMENTS.IPFS_SW_CONFIG_UI}`}>config page</Link> for this Service Worker Gateway instance.</li>
          <li>Install the <Link href='https://docs.ipfs.tech/install/ipfs-companion'>IPFS companion browser extension </Link> to run a local IPFS node.</li>
        </ul>
      </>
    )
  } else if (response.status === 404) {
    const url = new URL(request.resource)

    message = (
      <>
        <p className='f5 ma0 pt3 teal fw4 db'>The path {url.pathname} was not found under the CID {url.hostname.split('.ipfs')[0]}</p>
      </>
    )
  } else if (response.status >= 400 && response.status < 500) {
    message = (
      <>
        <p className='f5 ma0 pt3 teal fw4 db'>The request was invalid</p>
      </>
    )
  }

  let checkAvailabilityButton = <></>

  if (cid != null) {
    checkAvailabilityButton = (
      <>
        <Button className='bg-navy-muted' onClick={() => checkAvailability(cid)}>Check CID availability</Button>
      </>
    )
  }

  return (
    <>
      <ContentBox title={`${response.status} ${response.statusText}`}>
        <>
          {message}
          <p>
            <Button className='bg-teal' onClick={retry}>Retry</Button>
            <Button className='bg-navy-muted' onClick={goBack}>Go back</Button>
            <Button className='bg-navy-muted' onClick={toggleDebugInfo}>{showDebugInfo ? 'Hide' : 'Show'} debug info</Button>
            {checkAvailabilityButton}
          </p>
          {showDebugInfo && <DebugInfo request={request} response={response} config={config} logs={logs} />}
        </>
      </ContentBox>
    </>
  )
}
