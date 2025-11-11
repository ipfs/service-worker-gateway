import React from 'react'
import type { PropsWithChildren, ReactElement } from 'react'

export interface ButtonProps extends PropsWithChildren {
  onClick: any
  className?: string
}

export function Button ({ onClick, className, children }: ButtonProps): ReactElement {
  return (
    <>
      <button className={`button bn br2 mr2 pa2 pl3 pr3 snow-muted ${className ?? ''}`} onClick={onClick}>{children}</button>
    </>
  )
}
