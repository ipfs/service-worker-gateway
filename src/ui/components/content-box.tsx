import React from 'react'
import type { PropsWithChildren, ReactElement } from 'react'

export interface ContentBoxProps extends PropsWithChildren {
  title: string | ReactElement | ReactElement[]
  navigation?: string | ReactElement | ReactElement[]
}

export default function ContentBox ({ title, navigation, children }: ContentBoxProps): ReactElement {
  return (
    <main className='ma3 br2 ba sans-serif br2 b--gray-muted'>
      <header className='pt2 pb2 pl3 pr3 bg-snow bb b--gray-muted flex'>
        <strong className='w-90 truncate'>{title}</strong>
        <div className='w-10 tr'>{navigation}</div>
      </header>
      <section className='bg-white'>
        {children}
      </section>
    </main>
  )
}
