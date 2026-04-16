import React from 'react'
import { parseRequest } from '../../lib/parse-request.ts'
import { removeRootHashIfPresent } from '../../lib/remove-root-hash.ts'
import { toGatewayRoot } from '../../lib/to-gateway-root.ts'
import { Button } from '../components/button.tsx'
import ContentBox from '../components/content-box.tsx'
import { createLink } from '../utils/links.ts'
import type { ResolvableURI } from '../../lib/parse-request-cheap.ts'
import type { ReactElement } from 'react'

declare global {
  var downloadingPage: {
    request: ResolvableURI
  }
}

function findCid (): string | void {
  try {
    const url = new URL(globalThis.location.href)
    const req = parseRequest(url, url)

    if ((req.type === 'subdomain' || req.type === 'path' || req.type === 'native') && req.protocol === 'ipfs') {
      return req.cid.toString()
    }
  } catch {}
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
  const cid = findCid()

  function retry (): void {
    // remove any UI-added navigation info
    history.pushState('', document.title, window.location.pathname + window.location.search)

    // @ts-expect-error boolean `forceGet` argument is firefox-only
    window.location.reload(true)
  }

  let viewPreviewBlockButton = <></>

  if (viewPreviewBlockButton && cid != null) {
    viewPreviewBlockButton = (
      <>
        <Button
          className='bg-navy-muted' onClick={(evt: MouseEvent) => {
            evt.preventDefault()
            evt.stopPropagation()

            window.location.href = createLink({
              params: {
                download: 'false'
              }
            })
          }}
        >Preview block
        </Button>
      </>
    )
  }

  return (
    <>
      <ContentBox title='Download'>
        <>
          <p className='f5 ma3 fw4 db'>Your download should begin shortly. If it does not, please retry.</p>
          <p className='ma3'>
            <Button className='bg-teal' onClick={retry}>Retry</Button>
            {viewPreviewBlockButton}
          </p>
        </>
      </ContentBox>
    </>
  )
}
