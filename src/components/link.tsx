import 'react'
import type { PropsWithChildren } from "react";

export interface LinkProps extends PropsWithChildren {
  href: string
}

export function Link ({ href, children }: LinkProps) {
  return (
    <>
      <a href={href} target='_blank' rel='noopener noreferrer' className='link'>{children}</a>
    </>
  )
}
