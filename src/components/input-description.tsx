import React from 'react'

export const InputDescription: React.FC<{ description?: string }> = ({ description }) => {
  if (description == null || description.length === 0) {
    return null
  }

  return (<span className="charcoal f6 fw1 db pt1 lh-copy mb2">{description}</span>)
}
