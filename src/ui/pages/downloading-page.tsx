import React from 'react'
import { removeRootHashIfPresent } from '../../lib/remove-root-hash.ts'
import { toGatewayRoot } from '../../lib/to-gateway-root.ts'
import { Button } from '../components/button.tsx'
import ContentBox from '../components/content-box.tsx'
import type { ResolvableURI } from '../../lib/parse-request-cheap.ts'
import type { ReactElement } from 'react'

declare global {
  var downloadingPage: {
    request: ResolvableURI
  }
}

export interface DownloadingPageProps {
  request?: ResolvableURI
}

export function DownloadingPage ({ request }: DownloadingPageProps): ReactElement {
  request = request ?? globalThis.downloadingPage?.request

  if (request == null) {
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

  return (
    <>
      <ContentBox title='Download'>
        <>
          <p className='f5 ma3 fw4 db'>Your download should begin shortly. If it does not, please retry.</p>
          <p className='ma3'>
            <Button className='bg-teal' onClick={retry}>Retry</Button>
          </p>
        </>
      </ContentBox>
    </>
  )
}
