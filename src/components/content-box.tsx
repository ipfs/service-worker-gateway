import React from 'react'
import type { PropsWithChildren, ReactElement } from 'react'

export interface ContentBoxProps extends PropsWithChildren {
  title: string
}

export default function ContentBox ({ title, children }: ContentBoxProps): ReactElement {
  return (
    <main className='ma3 br2 ba sans-serif ba br2 b--gray-muted'>
      <header className='pt2 pb2 pl3 pr3 bg-snow bb b--gray-muted'>
        <strong>{title}</strong>
      </header>
      <section className='pt2 pb2 pl3 pr3 bg-white'>
        {children}
      </section>
    </main>
  )
}
