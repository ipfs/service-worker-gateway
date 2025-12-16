import React from 'react'
import { IconButton } from './icon-button.tsx'
import type { CID } from 'multiformats/cid'
import type { PropsWithChildren, ReactElement } from 'react'

export interface CopyCidButtonProps extends PropsWithChildren {
  cid: CID | string
  className?: string
}

export function CopyCidButton ({ cid, children, className }: CopyCidButtonProps): ReactElement {
  function copyCIDToClipboard (evt: MouseEvent): void {
    evt.preventDefault()
    evt.stopPropagation()

    navigator.clipboard.writeText(cid.toString())
      .catch(() => {})
  }

  return (
    <IconButton className={className} onClick={copyCIDToClipboard} title='Copy CID to clipboard'>
      {children}
    </IconButton>
  )
}
