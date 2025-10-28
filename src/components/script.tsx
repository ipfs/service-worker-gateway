import React from 'react'
import type { ReactElement } from 'react'

export interface ScriptProps {
  script: string
}

export function Script ({ script }: ScriptProps): ReactElement {
  return (
    <>
      <script type='text/javascript' dangerouslySetInnerHTML={{ __html: script }} />
    </>
  )
}
