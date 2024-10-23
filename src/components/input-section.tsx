import React from 'react'

export const InputSection: React.FC<{ label: string, children: React.ReactNode[] }> = ({ label, children }) => {
  return (
    <div className="bl bw2 br2 b--teal-muted pl2 mb3">
      <span className='f3 ma0 teal fw4 db'>{label}</span>
      {children}
    </div>
  )
}
