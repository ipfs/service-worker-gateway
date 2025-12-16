import React from 'react'
import type { PropsWithChildren, ReactElement } from 'react'

export default function Terminal ({ children }: PropsWithChildren): ReactElement {
  return (
    <pre className='terminal br2 ma3 pa3 snow-muted'>
      {children}
    </pre>
  )
}
