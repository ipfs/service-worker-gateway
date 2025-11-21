import React, { useState } from 'react'
import { CIDInput } from './cid-input.jsx'
import { EntityBytesInput } from './entity-bytes-input.jsx'
import { InputLabel } from './input-label.jsx'
import { InputSection } from './input-section.js'
import { InputSelect } from './input-select.jsx'
import { InputToggle } from './input-toggle.js'
import type { ReactElement } from 'react'

export interface DownloadFormProps {
  handleSubmit(e: React.FormEvent): void
  requestPath: string
  setRequestPath(path: string): void

  download: boolean
  setDownload(download: boolean): void
  filename: string
  setFilename(filename: string): void
  format: string
  setFormat(format: string): void

  dagScope: string
  setDagScope(dagScope: string): void
  entityBytesFrom: string
  setEntityBytesFrom(entityBytesFrom: string): void
  entityBytesTo: string
  setEntityBytesTo(entityBytesTo: string): void
  carVersion: string
  setCarVersion(carVersion: string): void
  carOrder: string
  setCarOrder(carOrder: string): void
  carDups: string
  setCarDups(carDups: string): void
}

export default function DownloadForm ({
  handleSubmit,
  requestPath,
  setRequestPath,
  download,
  setDownload,
  filename,
  setFilename,
  format,
  setFormat,
  dagScope,
  setDagScope,
  entityBytesFrom,
  setEntityBytesFrom,
  entityBytesTo,
  setEntityBytesTo,
  carVersion,
  setCarVersion,
  carOrder,
  setCarOrder,
  carDups,
  setCarDups
}: DownloadFormProps): ReactElement {
  const [invalid, setInvalid] = useState<Record<string, boolean>>({})

  let carOptions = <></>

  if (format === 'car') {
    carOptions = (
      <div className='mt2'>
        <InputSection label='CAR options'>
          <InputSelect
            label='CAR Version'
            value={carVersion}
            onChange={setCarVersion}
          >
            <option />
            <option>1</option>
            <option>2</option>
          </InputSelect>

          <InputSelect
            label='Block Traversal Order'
            value={carOrder}
            onChange={setCarOrder}
          >
            <option />
            <option value='dfs'>Depth-first</option>
            <option value='unk'>Unknown</option>
          </InputSelect>

          <InputSelect
            label='Allow Duplicate Blocks'
            value={carDups}
            onChange={setCarDups}
          >
            <option />
            <option value='y'>Yes</option>
            <option value='n'>No</option>
          </InputSelect>

          <InputSelect
            label='DAG Scope'
            value={dagScope}
            onChange={setDagScope}
          >
            <option />
            <option value='block'>Block</option>
            <option value='entity'>Entity</option>
            <option value='all'>All</option>
          </InputSelect>

          <InputLabel>Entity Bytes</InputLabel>
          <EntityBytesInput
            from={entityBytesFrom}
            to={entityBytesTo}
            setFrom={setEntityBytesFrom}
            setTo={setEntityBytesTo}
            setInvalid={(res) => {
              setInvalid({
                ...invalid,
                'entity-bytes': res
              })
            }}
          />
        </InputSection>
      </div>
    )
  }

  let downloadForm = <></>

  if (download) {
    downloadForm = (
      <>
        <label htmlFor='filename' className='f5 pb2 teal fw4 db mt3'>Filename</label>
        <input
          className='input-reset bn black-80 bg-white pa3 w-100'
          id='filename'
          name='filename'
          type='text'
          placeholder='example.txt'
          required
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
        />

        <InputSelect
          label='Format'
          value={format}
          onChange={setFormat}
        >
          <option />
          <option value='raw'>Raw</option>
          <option value='car'>CAR</option>
          <option value='tar'>TAR</option>
          <option value='dag-json'>DAG-JSON</option>
          <option value='dag-cbor'>DAG-CBOR</option>
          <option value='json'>JSON</option>
          <option value='cbor'>CBOR</option>
          <option value='ipns-record'>IPNS Record</option>
        </InputSelect>

        {carOptions}
      </>
    )
  }

  return (
    <>
      <form id='add-file' onSubmit={handleSubmit}>
        <CIDInput
          requestPath={requestPath}
          setRequestPath={setRequestPath}
          setInvalid={(res) => {
            setInvalid({
              ...invalid,
              'entity-bytes': res
            })
          }}
        />

        <InputToggle
          className='e2e-download-page-input e2e-download-page-input-download'
          label='Download'
          description='By default content will be rendered by your browser, alternatively download content as a file'
          value={download}
          onChange={setDownload}
        />
        {downloadForm}

        <div className='bg-snow mw7 center w-100 mt4'>
          <button
            id='load-directly'
            className='button pv3 tc bn bg-animate bg-teal-muted hover-bg-navy-muted white pointer f4 w-100'
            onClick={handleSubmit}
            disabled={Object.values(invalid).reduce((acc, curr) => acc || curr, false)}
          >Load content
          </button>
        </div>
      </form>
    </>
  )
}
