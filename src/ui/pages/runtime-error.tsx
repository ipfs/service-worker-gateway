import React from 'react'
import { Button } from '../components/button.tsx'
import ContentBox from '../components/content-box.tsx'
import { Link } from '../components/link.tsx'
import Terminal from '../components/terminal.tsx'
import type { ReactElement } from 'react'

function isAggregateError (obj?: any): obj is AggregateError {
  return obj?.name === 'AggregateError' || obj instanceof AggregateError
}

function toErrorObject (error: any): any {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    code: error.code,
    cause: error.cause,
    reason: error.reason,
    errors: isAggregateError(error) ? error.errors.map(e => toErrorObject(e)) : undefined
  }
}

export interface RuntimeErrorPageProps {
  error: Error
}

export function RuntimeErrorPage ({ error }: RuntimeErrorPageProps): ReactElement {
  function retry (): void {
    // remove any UI-added navigation info
    history.pushState('', document.title, window.location.pathname + window.location.search)

    // @ts-expect-error boolean `forceGet` argument is firefox-only
    window.location.reload(true)
  }

  function goBack (): void {
    window.history.back()
  }

  return (
    <>
      <ContentBox title='Error'>
        <>
          <p className='f5 ma3 fw4 db lh-copy'>A runtime error occurred in the service worker gateway UI</p>
          <p className='f5 ma3 fw4 db lh-copy'>Please <Link href='https://github.com/ipfs/service-worker-gateway/issues'>open an issue</Link> with the URL you tried to access and any debugging information displayed below.</p>
          <Terminal>{JSON.stringify(toErrorObject(error), null, 2)}</Terminal>
          <p className='f5 ma3 fw4 db'>
            <Button className='bg-teal' onClick={retry}>Retry</Button>
            <Button className='bg-navy-muted' onClick={goBack}>Go back</Button>
          </p>
        </>
      </ContentBox>
    </>
  )
}
