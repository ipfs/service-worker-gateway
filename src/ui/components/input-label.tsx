import React from 'react'
import type { PropsWithChildren } from 'react'

export const InputLabel: React.FC<PropsWithChildren> = ({ children, ...props }) => {
  return (
    <span className='f5 ma0 pt3 teal fw4 db' {...props}>{children}</span>
  )
}
