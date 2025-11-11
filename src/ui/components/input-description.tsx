import React from 'react'
import type { PropsWithChildren } from 'react'

export const InputDescription: React.FC<PropsWithChildren> = ({ children }) => {
  if (children == null || children.toString().length === 0) {
    return null
  }

  return (<span className='charcoal f6 fw1 db pt1 lh-copy mb2'>{children}</span>)
}
