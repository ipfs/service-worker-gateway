import React from 'react'
import type { PropsWithChildren, ReactElement } from 'react'

export interface LinkProps extends PropsWithChildren {
  href: string
}

/**
 * This is a link to an outside resource - clicking it will open a new window
 * with no opener or referrer information to preserve user privacy.
 */
export function Link ({ href, children }: LinkProps): ReactElement {
  return (
    <>
      <a href={href} target='_blank' rel='noopener noreferrer' className='link'>{children}</a>
    </>
  )
}
