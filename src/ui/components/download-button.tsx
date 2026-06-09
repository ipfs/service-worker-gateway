import React from 'react'
import { createLink } from '../utils/links.ts'
import { IconButton } from './icon-button.tsx'
import type { PropsWithChildren, ReactElement } from 'react'

export interface DownloadButtonProps extends PropsWithChildren {
  ipfsPath: string
  className?: string
}

export function DownloadButton ({ ipfsPath, children, className }: DownloadButtonProps): ReactElement {
  function download (evt: MouseEvent): void {
    evt.preventDefault()
    evt.stopPropagation()

    window.location.href = createLink({
      ipfsPath,
      params: {
        download: 'true'
      }
    })
  }

  return (
    <IconButton className={className} onClick={download} title='Download'>
      {children}
    </IconButton>
  )
}
