import React from 'react'
import { removeRootHashIfPresent } from '../../lib/remove-root-hash.js'
import { toGatewayRoot } from '../../lib/to-gateway-root.js'
import { Button } from '../components/button.jsx'
import ContentBox from '../components/content-box.jsx'
import { Link } from '../components/link.jsx'
import Terminal from '../components/terminal.jsx'
import type { ReactElement } from 'react'

/**
 * Fields from an Error object that have been made enumerable to survive passing
 * through JSON.stringify
 */
export interface ErrorObject {
  name: string
  message: string
  stack?: string
  code?: string
  cause?: any
  reason?: any
  errors?: ErrorObject[]
}

declare global {
  var serverError: {
    url: string
    title: string
    error: ErrorObject
    logs: string[]
    description?: string | string[]
  }
}

export interface ServerErrorPageProps {
  message?: string
  url?: string
  title?: string
  error?: ErrorObject
  logs?: string[]
  description?: string | string[]
}

function DebugInfo ({ url, error, logs }: { url: string, error: ErrorObject, logs: string[] }): ReactElement {
  let urlDisplay = <></>

  if (url != null) {
    urlDisplay = (
      <>
        <h4 className='ma3'>URL</h4>
        <Terminal>{url}</Terminal>
      </>
    )
  }

  let errorDisplay = <></>

  if (error != null) {
    errorDisplay = (
      <>
        <h4 className='ma3'>Error</h4>
        <Terminal>{JSON.stringify(error, null, 2)}</Terminal>
      </>
    )
  }

  let logDisplay = <></>

  if (logs?.length > 0) {
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
      {urlDisplay}
      {errorDisplay}
      {logDisplay}
    </>
  )
}

export function ServerErrorPage ({ url, error, title, logs, description }: ServerErrorPageProps): ReactElement {
  url = url ?? globalThis.serverError?.url
  error = error ?? globalThis.serverError?.error
  title = title ?? globalThis.serverError?.title
  logs = logs ?? globalThis.serverError?.logs
  description = description ?? globalThis.serverError?.description

  if (url == null || error == null || logs == null || title == null) {
    globalThis.location.href = toGatewayRoot('/')

    return (
      <></>
    )
  }

  removeRootHashIfPresent()

  function retry (): void {
    // remove any UI-added navigation info
    history.pushState('', document.title, window.location.pathname + window.location.search)

    // @ts-expect-error boolean `forceGet` argument is firefox-only
    window.location.reload(true)
  }

  function goBack (): void {
    window.history.back()
  }

  const messageDisplay: ReactElement[] = []

  if (description != null) {
    if (typeof description === 'string') {
      description = [description]
    }

    if (Array.isArray(description)) {
      description.forEach((line, index) => {
        messageDisplay.push(
          <p className='f5 ma3 fw4 db' key={`line-${index}`}>{line}</p>
        )
      })
    }
  }

  if (messageDisplay.length === 0) {
    messageDisplay.push(
      <p className='f5 ma3 fw4 db' key='line-0'>An error occurred in the service worker gateway.</p>
    )
  }

  return (
    <>
      <ContentBox title={`${title}`}>
        <>
          {messageDisplay}
          <p className='f5 ma3 fw4 db'>Please <Link href='https://github.com/ipfs/service-worker-gateway/issues'>open an issue</Link> with the URL you tried to access and any debugging information displayed below.</p>
          <p className='f5 ma3 fw4 db'>
            <Button className='bg-teal' onClick={retry}>Retry</Button>
            <Button className='bg-navy-muted' onClick={goBack}>Go back</Button>
          </p>
          <DebugInfo url={url} error={error} logs={logs} />
        </>
      </ContentBox>
    </>
  )
}
