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
    cid?: string
  }
}

function checkAvailability (cid: string): void {
  window.open(`https://check.ipfs.network/?cid=${cid}`)
}

export interface DownloadingPageProps {
  request?: ResolvableURI
  cid?: string
}

export function DownloadingPage ({ request, cid }: DownloadingPageProps): ReactElement {
  request = request ?? globalThis.downloadingPage?.request
  cid = cid ?? globalThis.downloadingPage?.cid

  if (request == null) {
    globalThis.location.href = toGatewayRoot('/')

    return (
      <></>
    )
  }

  let checkAvailabilityButton = <></>

  if (cid != null) {
    checkAvailabilityButton = (
      <>
        <Button className='bg-teal' onClick={() => checkAvailability(cid)}>Check CID availability</Button>
      </>
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
            {checkAvailabilityButton}
            <Button className={cid == null ? 'bg-teal' : 'bg-navy-muted'} onClick={retry}>Retry</Button>
          </p>
        </>
      </ContentBox>
    </>
  )
}
