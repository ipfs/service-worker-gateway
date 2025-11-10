import React, { useState, useEffect } from 'react'
import Form from '../components/form.jsx'
import CidRenderer from '../components/input-validator.jsx'
import { ServiceWorkerProvider } from '../context/service-worker-context.jsx'
import { dnsLinkLabelDecoder, isInlinedDnsLink } from '../lib/dns-link-labels.js'
import { LOCAL_STORAGE_KEYS } from '../lib/local-storage.js'
import './default-page-styles.css'
import { pathRegex, subdomainRegex } from '../lib/regex.js'
import { removeRootHashIfPresent } from '../lib/remove-root-hash.js'
import type { ReactElement } from 'react'

function LoadContent (): ReactElement {
  removeRootHashIfPresent()

  let initialPath = localStorage.getItem(LOCAL_STORAGE_KEYS.forms.requestPath) ?? ''

  if (initialPath === '') {
    // try to read path from location if not previously set
    const groups = globalThis.location.href.match(subdomainRegex)?.groups ?? globalThis.location.href.match(pathRegex)?.groups

    if (groups != null) {
      let name = groups.cidOrPeerIdOrDnslink

      // decode the domain name if it's an inline dnslink
      if (groups.protocol === 'ipns' && isInlinedDnsLink(name)) {
        name = dnsLinkLabelDecoder(name)
      }

      initialPath = `/${[
        groups.protocol,
        name,
        groups.path.split('#')[0]
      ]
        .filter((val) => Boolean(val) && val !== '/')
        .join('/')}`
    }
  }

  const [requestPath, setRequestPath] = useState(initialPath)

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.forms.requestPath, requestPath)
  }, [requestPath])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
  }

  return (
    <>
      <main className='e2e-helper-ui pa4-l bg-snow mw7 mv4-l center pa4 br2'>
        <h1 className='pa0 f3 ma0 mb4 teal tc'>Fetch & Verify IPFS Content in Browser</h1>
        <p className='charcoal f6 fw1 db pt1 lh-copy mb2'>Enter a CID, IPFS Path, or URL to download data in a safe and verified way.</p>
        <Form
          handleSubmit={handleSubmit}
          requestPath={requestPath}
          setRequestPath={setRequestPath}
        />
        <div className='bg-snow mw7 center w-100'>
          <CidRenderer requestPath={requestPath} />
        </div>
      </main>
    </>
  )
}

export default (): ReactElement => {
  return (
    <ServiceWorkerProvider>
      <LoadContent />
    </ServiceWorkerProvider>
  )
}
