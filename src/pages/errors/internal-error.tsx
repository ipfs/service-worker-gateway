/**
 * Page to display a user friendly message when `navigator.serviceWorker` is not available.
 */

import React from 'react'
import { Button } from '../../button.jsx'
import Header from '../../components/Header.jsx'
import ContentBox from '../../components/content-box.jsx'
import Terminal from '../../components/terminal.jsx'
import type { ReactElement } from 'react'

declare global {
  var props: any
}

export interface InternalErrorPageProps {
  error?: any,
  response?: any
  config?: any
}

export function InternalErrorPage ({ error, response, config }: InternalErrorPageProps): ReactElement {
  function retry (): void {
    // @ts-expect-error boolean argument is firefox-only
    window.location.reload(true)
  }

  function goBack (): void {
    window.history.back()
  }

  error = error ?? globalThis.props?.error
  response = response ?? globalThis.props?.response
  config = config ?? globalThis.props?.config

  let errorDisplay = <></>

  if (error != null) {
    errorDisplay = (
      <>
        <h3>Error</h3>
        <Terminal>{error.stack ?? error.message ?? error.toString()}</Terminal>
      </>
    )
  }

  let responseDisplay = <></>

  if (response != null) {
    responseDisplay = (
      <>
        <h3>Response</h3>
        <Terminal>{JSON.stringify(response, null, 2)}</Terminal>
      </>
    )
  }

  let configDisplay = <></>

  if (config != null) {
    configDisplay = (
      <>
        <h3>Configuration</h3>
        <Terminal>{JSON.stringify(config, null, 2)}</Terminal>
      </>
    )
  }

  return (
    <>
      <Header />
      <ContentBox title='Internal Error'>
        <>
          <p>An error occurred in the service worker gateway.</p>
          <p>Please <a href='https://github.com/ipfs/service-worker-gateway/issues' className='link' target='_blank' rel='noopener noreferrer'>open an issue</a> with the URL you tried to access and any debugging information displayed below.</p>
          <p>
            <Button className='bg-teal' onClick={retry}>Retry</Button>
            <Button className='bg-navy-muted' onClick={goBack}>Go back</Button>
          </p>
          {errorDisplay}
          {responseDisplay}
          {configDisplay}
        </>
      </ContentBox>
    </>
  )
}
