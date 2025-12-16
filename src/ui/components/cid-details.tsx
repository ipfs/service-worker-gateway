import React from 'react'
import { FaFileDownload, FaFileCode, FaCopy } from 'react-icons/fa'
import { MULTICODECS } from '../pages/multicodec-table.ts'
import { CopyCidButton } from './copy-cid-button.tsx'
import { DownloadBlockButton } from './download-block-button.tsx'
import { ViewBlockButton } from './view-block-button.tsx'
import type { CID } from 'multiformats/cid'
import type { ReactElement } from 'react'

export interface CIDDetailsProps {
  cid: CID
  ipfsPath: string
  className?: string
  buttonClassName?: string
}

export function CIDDetails ({ cid, ipfsPath, className, buttonClassName }: CIDDetailsProps): ReactElement {
  return (
    <div className={`db normal flex ${className ?? ''}`}>
      <code className='mt1'>
        CIDv{cid.version} {MULTICODECS[cid.code].name} {MULTICODECS[cid.multihash.code].name}
      </code>
      <CopyCidButton cid={cid} className={`ml1 ${buttonClassName ?? ''}`}>
        <FaCopy />
      </CopyCidButton>
      <DownloadBlockButton ipfsPath={ipfsPath} className={`ml1 ${buttonClassName ?? ''}`}>
        <FaFileDownload />
      </DownloadBlockButton>
      <ViewBlockButton ipfsPath={ipfsPath} className={`ml1 ${buttonClassName ?? ''}`}>
        <FaFileCode />
      </ViewBlockButton>
    </div>
  )
}
