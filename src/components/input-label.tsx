import React from 'react'

export const InputLabel: React.FC<{ label: string }> = ({ label }) => {
  return (<span className='f5 ma0 pt3 teal fw4 db'>{label}</span>)
}
