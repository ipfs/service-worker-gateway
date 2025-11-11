import React from 'react'
import type { PropsWithChildren } from 'react'

export const InputLabel: React.FC<PropsWithChildren> = ({ children }) => {
  return (<span className='f5 ma0 pt3 teal fw4 db'>{children}</span>)
}
