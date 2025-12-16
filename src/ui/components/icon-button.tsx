import React from 'react'
import type { PropsWithChildren, ReactElement } from 'react'

export interface ButtonProps extends PropsWithChildren {
  onClick: any
  className?: string
  title?: string
}

export function IconButton ({ onClick, className, title, children }: ButtonProps): ReactElement {
  return (
    <>
      <button
        className={`button bn br2 icon pt1 ${className ?? ''}`}
        onClick={onClick}
        title={title}
      >{children}
      </button>
    </>
  )
}
