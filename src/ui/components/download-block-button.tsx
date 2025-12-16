import React from 'react'
import { createLink } from '../utils/links.ts'
import { IconButton } from './icon-button.tsx'
import type { PropsWithChildren, ReactElement } from 'react'

export interface DownloadBlockButtonProps extends PropsWithChildren {
  ipfsPath: string
  className?: string
}

export function DownloadBlockButton ({ ipfsPath, children, className }: DownloadBlockButtonProps): ReactElement {
  function downloadBlock (evt: MouseEvent): void {
    evt.preventDefault()
    evt.stopPropagation()

    window.location.href = createLink({
      ipfsPath,
      params: {
        format: 'raw',
        download: 'true'
      }
    })
  }

  return (
    <IconButton className={className} onClick={downloadBlock} title='Download block'>
      {children}
    </IconButton>
  )
}
