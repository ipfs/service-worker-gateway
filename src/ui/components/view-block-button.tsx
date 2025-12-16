import React from 'react'
import { createLink } from '../utils/links.ts'
import { IconButton } from './icon-button.tsx'
import type { PropsWithChildren, ReactElement } from 'react'

export interface ViewRawBlockButtonProps extends PropsWithChildren {
  ipfsPath: string
  className?: string
}

export function ViewBlockButton ({ ipfsPath, children, className }: ViewRawBlockButtonProps): ReactElement {
  function viewBlock (evt: MouseEvent): void {
    evt.preventDefault()
    evt.stopPropagation()

    window.location.href = createLink({
      ipfsPath,
      params: {
        format: 'raw',
        download: 'false'
      }
    })
  }

  return (
    <IconButton className={className} onClick={viewBlock} title='View block'>
      {children}
    </IconButton>
  )
}
