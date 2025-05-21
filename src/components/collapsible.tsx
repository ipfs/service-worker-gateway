import React, { useState } from 'react'
import type { ReactElement } from 'react'

export interface CollapsibleProps {
  children: React.ReactNode
  collapsedLabel: string
  expandedLabel: string
  collapsed: boolean
}

export function Collapsible ({ children, collapsedLabel, expandedLabel, collapsed }: CollapsibleProps): ReactElement {
  const [cId] = useState(Math.random().toString(36).substring(7))
  const [isCollapsed, setCollapsed] = useState(collapsed)

  return (
    <>
      <input type='checkbox' className='dn' name='collapsible' id={`collapsible-${cId}`} onClick={() => { setCollapsed(!isCollapsed) }} />
      <label htmlFor={`collapsible-${cId}`} className='e2e-collapsible-button collapsible__item-label db pv3 link black hover-blue pointer blue'>{isCollapsed ? collapsedLabel : expandedLabel}</label>
      <div className={`${isCollapsed ? 'dn' : ''}`}>
        {children}
      </div>
    </>
  )
}
