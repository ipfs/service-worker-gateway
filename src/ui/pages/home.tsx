import React, { useState, useEffect } from 'react'
import { dnsLinkLabelDecoder, isInlinedDnsLink } from '../../lib/dns-link-labels.js'
import { LOCAL_STORAGE_KEYS } from '../../lib/local-storage.js'
import { pathRegex, subdomainRegex } from '../../lib/regex.js'
import { removeRootHashIfPresent } from '../../lib/remove-root-hash.js'
import { getGatewayRoot } from '../../lib/to-gateway-root.js'
import DownloadForm from '../components/download-form.jsx'
import { ServiceWorkerProvider } from '../context/service-worker-context.jsx'
import './default-page-styles.css'
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
  const [download, setDownload] = useState(false)
  const [format, setFormat] = useState('')
  const [filename, setFilename] = useState('')
  const [dagScope, setDagScope] = useState('')
  const [entityBytesFrom, setEntityBytesFrom] = useState('')
  const [entityBytesTo, setEntityBytesTo] = useState('')
  const [carVersion, setCarVersion] = useState('')
  const [carOrder, setCarOrder] = useState('')
  const [carDups, setCarDups] = useState('')

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.forms.requestPath, requestPath)
  }, [requestPath])

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()

    const params: Record<string, string> = {
      download: download ? 'true' : '',
      format,
      filename,
      'dag-scope': dagScope,
      'car-version': carVersion,
      'car-order': carOrder,
      'car-dups': carDups
    }

    if (entityBytesFrom !== '' && entityBytesTo !== '') {
      params['entity-bytes'] = `${entityBytesFrom}:${entityBytesTo}`
    }

    // ignore any non-car options
    if (format !== 'car') {
      params['dag-scope'] = ''
      params['car-version'] = ''
      params['car-order'] = ''
      params['car-dups'] = ''
      params['entity-bytes'] = ''
    }

    // filter any empty options, encode them and join together
    const search = Object.entries(params)
      .filter(([key, value]) => value !== '')
      .map(([key, value]) => {
        // do not uri-encode the ':' character
        if (key === 'entity-bytes') {
          return `${key}=${value}`
        }

        return `${key}=${encodeURIComponent(value)}`
      })
      .join('&')

    window.location.href = getGatewayRoot() + requestPath + (search === '' ? '' : `?${search}`)
  }

  return (
    <>
      <main className='e2e-helper-ui pa4-l bg-snow mw7 mv4-l center pa4 br2'>
        <h1 className='pa0 f3 ma0 mb4 teal tc'>Fetch & Verify IPFS Content in Browser</h1>
        <p className='charcoal f6 fw1 db pt1 lh-copy mb2'>Enter a CID, IPFS Path, or URL to download data in a safe and verified way.</p>
        <DownloadForm
          handleSubmit={handleSubmit}
          requestPath={requestPath}
          setRequestPath={setRequestPath}
          download={download}
          setDownload={setDownload}
          format={format}
          setFormat={setFormat}
          filename={filename}
          setFilename={setFilename}
          dagScope={dagScope}
          setDagScope={setDagScope}
          entityBytesFrom={entityBytesFrom}
          setEntityBytesFrom={setEntityBytesFrom}
          entityBytesTo={entityBytesTo}
          setEntityBytesTo={setEntityBytesTo}
          carVersion={carVersion}
          setCarVersion={setCarVersion}
          carOrder={carOrder}
          setCarOrder={setCarOrder}
          carDups={carDups}
          setCarDups={setCarDups}
        />
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
