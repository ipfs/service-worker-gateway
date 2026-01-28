import React, { useState, useEffect } from 'react'
import { LOCAL_STORAGE_KEYS } from '../../lib/local-storage.ts'
import { removeRootHashIfPresent } from '../../lib/remove-root-hash.ts'
import { getGatewayRoot } from '../../lib/to-gateway-root.ts'
import DownloadForm from '../components/download-form.tsx'
import './default-page-styles.css'
import type { ReactElement } from 'react'

function LoadContent (): ReactElement {
  removeRootHashIfPresent()

  const initialPath = localStorage.getItem(LOCAL_STORAGE_KEYS.forms.requestPath) ?? ''

  const [requestPath, setRequestPath] = useState(initialPath)
  const [download, setDownload] = useState('')
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
    e.stopPropagation()
    e.preventDefault()

    const params: Record<string, string> = {
      download,
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

    let request = requestPath

    if (!request.startsWith('/ipfs/') && !request.startsWith('/ipns/')) {
      request = `/ipfs/${request}`
    }

    window.location.href = getGatewayRoot() + request + (search === '' ? '' : `?${search}`)
  }

  return (
    <>
      <main className='e2e-helper-ui pa4-l bg-snow mw7 mv4-l center pa4 br2'>
        <h1 className='pa0 f3 ma0 mb4 teal tc'>Fetch & Verify IPFS Content in Browser</h1>
        <p className='db pt1 lh-copy mb2'>Enter a CID, IPFS Path, or URL to download data in a safe and verified way.</p>
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
    <LoadContent />
  )
}
