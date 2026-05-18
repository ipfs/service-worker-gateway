import React from 'react'
import { createLink } from '../utils/links.ts'
import { IconButton } from './icon-button.tsx'
import type { PropsWithChildren, ReactElement } from 'react'

export interface InspectBlockButtonProps extends PropsWithChildren {
  ipfsPath: string
  className?: string
}

export function InspectBlockButton ({ ipfsPath, children, className }: InspectBlockButtonProps): ReactElement {
  function inspectBlock (evt: MouseEvent): void {
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
    <IconButton className={className} onClick={inspectBlock} title='Inspect block'>
      {children}
    </IconButton>
  )
}
