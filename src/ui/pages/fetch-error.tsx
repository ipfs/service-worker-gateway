import React, { useState } from 'react'
import { isPathGatewayRequest, isSubdomainGatewayRequest } from '../../lib/path-or-subdomain.ts'
import { removeRootHashIfPresent } from '../../lib/remove-root-hash.ts'
import { toGatewayRoot } from '../../lib/to-gateway-root.ts'
import { Button } from '../components/button.tsx'
import ContentBox from '../components/content-box.tsx'
import { Link } from '../components/link.tsx'
import Terminal from '../components/terminal.tsx'
import { createLink } from '../utils/links.ts'
import type { RequestDetails, ResponseDetails } from '../../sw/pages/fetch-error-page.ts'
import type { ReactElement } from 'react'

declare global {
  var fetchError: {
    request: RequestDetails
    response: ResponseDetails
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

function toResponse (response: ResponseDetails): string {
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

${body}`.trim()
}

function findCid (request: RequestDetails): string | void {
  try {
    const url = new URL(request.resource)

    if (isSubdomainGatewayRequest(url) && url.hostname.includes('.ipfs.')) {
      const [cid] = url.hostname.split('.ipfs.')

      if (cid != null) {
        return cid
      }
    } else if (isPathGatewayRequest(url) && url.pathname.startsWith('/ipfs/')) {
      const path = url.pathname.split('/')

      if (path.length > 2 && path[1] === 'ipfs') {
        return path[2]
      }
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
  logs?: string[]
  providers?: Providers
}

function DebugInfo ({ request, response, logs }: FetchErrorPageProps): ReactElement {
  let requestDisplay = <></>

  if (request != null) {
    requestDisplay = (
      <>
        <h4 className='ma3'>Request</h4>
        <Terminal>{toRequest(request)}</Terminal>
      </>
    )
  }

  let responseDisplay = <></>

  if (response != null) {
    responseDisplay = (
      <>
        <h4 className='ma3'>Response</h4>
        <Terminal>{toResponse(response)}</Terminal>
      </>
    )
  }

  let logDisplay = <></>

  if (logs != null) {
    logDisplay = (
      <>
        <h4 className='ma3'>Logs</h4>
        <Terminal>{logs.join('\n')}</Terminal>
      </>
    )
  }

  return (
    <>
      <h3 className='ma3'>Debug</h3>
      {/* this message is already displayed if it's a 500 */}
      {response?.status === 500 ? '' : <p className='ma3'>If you open a <Link href='https://github.com/ipfs/service-worker-gateway/issues?q=sort%3Aupdated-desc+is%3Aissue+is%3Aopen'>bug report</Link> please include all of the information below.</p>}
      {requestDisplay}
      {responseDisplay}
      {logDisplay}
    </>
  )
}

export function FetchErrorPage ({ request, response, logs, providers }: FetchErrorPageProps): ReactElement {
  request = request ?? globalThis.fetchError?.request
  response = response ?? globalThis.fetchError?.response
  logs = logs ?? globalThis.fetchError?.logs
  providers = providers ?? globalThis.fetchError?.providers

  if (request == null || response == null || logs == null || providers == null) {
    globalThis.location.href = toGatewayRoot('/')

    return (
      <></>
    )
  }

  removeRootHashIfPresent()

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
  let showCheckAvailability = Boolean(cid)

  const openIssueLink = (
    <>
      <p className='f5 ma3 fw4 db'>Please <Link href='https://github.com/ipfs/service-worker-gateway/issues'>open an issue</Link> with the URL you tried to access and any debugging information displayed below.</p>
    </>
  )

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
          These providers were found but did not return the requested data:
          {bitswapProviders.length > 0 ? '\n\nBitswap:\n\n' + JSON.stringify(bitswapProviders, null, 2) : ''}
          {trustlessGatewayProviders.length > 0 ? '\n\nTrustless Gateways:\n\n' + JSON.stringify(trustlessGatewayProviders, null, 2) : ''}
          {unknownProviders.length > 0 ? `\n\nUnknown Routing(s) (${providers.other.length}/${providers.otherCount}):\n\n` + JSON.stringify(unknownProviders, null, 2) : ''}
        </Terminal>
      </>
    )
  }

  const whatNextMessage = (
    <>
      <p className='f5 ma3 fw4 db'>How you can proceed:</p>
      <ul className='db pt1 lh-copy ma3'>
        <li>Verify the URL and try again.</li>
        <li>Self-host and run an <Link href='https://docs.ipfs.tech/concepts/ipfs-implementations/'>IPFS client</Link> that verifies your data.</li>
        <li>Try diagnosing your request with the <Link href='https://docs.ipfs.tech/reference/diagnostic-tools/'>IPFS diagnostic tools</Link>.</li>
        <li>Inspect the <Link href={`https://cid.ipfs.tech/${cid ? `#${cid}` : ''}`}>CID</Link> or <Link href={`https://explore.ipld.io/${cid ? `#/explore/${cid}` : ''}`}>DAG</Link>.</li>
        <li>Install the <Link href='https://docs.ipfs.tech/install/ipfs-companion'>IPFS companion browser extension </Link> to run a local IPFS node.</li>
      </ul>
    </>
  )

  let message = (
    <>
      <p className='f5 ma3 fw4 db'>An error occurred in the service worker gateway.</p>
      {openIssueLink}
    </>
  )

  if (response.body.includes('UnknownHashAlgorithmError')) {
    message = (
      <>
        <p className='f5 ma3 fw4 db'>The requested CID contains a hash algorithm for which no implementation has been configured so it is not possible to verify the received block.</p>
        <p className='f5 ma3 fw4 db'>It is not currently possible to configure arbitrary hashing algorithms though this could be a feature added in the future.</p>
        {openIssueLink}
      </>
    )
  } else if (response.status === 501) {
    message = (
      <>
        <p className='f5 ma3 fw4 db'>This gateway encountered content it did not know how to handle.</p>
        {openIssueLink}
      </>
    )
  } else if (response.status === 502) {
    message = (
      <>
        <p className='f5 ma3 fw4 db'>The content was loaded but could not be processed.</p>
        <Terminal>{response.body}</Terminal>
        {whatNextMessage}
      </>
    )
  } else if (response.status === 504) {
    message = (
      <>
        <p className='db pt1 lh-copy ma3'>Fetching your content from the <Link href='https://docs.ipfs.tech/concepts/glossary/#mainnet'>public IPFS network</Link> failed.</p>
        <Terminal>{response.body}</Terminal>
        {providersMessage}
        {whatNextMessage}
      </>
    )
  } else if (response.status === 404) {
    const url = new URL(request.resource)

    message = (
      <>
        <p className='f5 ma3 fw4 db'>The path {url.pathname} was not found under the CID {url.hostname.split('.ipfs')[0]}</p>
      </>
    )
  } else if (response.status === 406) {
    showCheckAvailability = false

    message = (
      <>
        <p className='f5 ma3 fw4 db'>The requested content cannot be represented in the requested format.</p>
      </>
    )
  } else if (response.status >= 400 && response.status < 500) {
    message = (
      <>
        <p className='f5 ma3 fw4 db'>The request was invalid</p>
      </>
    )
  }

  let checkAvailabilityButton = <></>

  if (showCheckAvailability && cid != null) {
    checkAvailabilityButton = (
      <>
        <Button className='bg-navy-muted' onClick={() => checkAvailability(cid)}>Check CID availability</Button>
      </>
    )
  }

  let viewRawBlockButton = <></>

  if (viewRawBlockButton && cid != null) {
    viewRawBlockButton = (
      <>
        <Button
          className='bg-navy-muted' onClick={(evt: MouseEvent) => {
            evt.preventDefault()
            evt.stopPropagation()

            window.location.href = createLink({
              params: {
                format: 'raw',
                download: 'false'
              }
            })
          }}
        >View raw block
        </Button>
      </>
    )
  }

  return (
    <>
      <ContentBox title={`${response.status} ${response.statusText}`}>
        <>
          {message}
          <p className='ma3'>
            <Button className='bg-teal' onClick={retry}>Retry</Button>
            <Button className='bg-navy-muted' onClick={goBack}>Go back</Button>
            <Button className='bg-navy-muted' onClick={toggleDebugInfo}>{showDebugInfo ? 'Hide' : 'Show'} debug info</Button>
            {checkAvailabilityButton}
            {viewRawBlockButton}
          </p>
          {showDebugInfo && <DebugInfo request={request} response={response} logs={logs} />}
        </>
      </ContentBox>
    </>
  )
}
