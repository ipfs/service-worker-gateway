import React, { useEffect, useMemo, useState } from 'react'
import { InputDescription } from './input-description.jsx'
import { InputLabel } from './input-label.jsx'
import type { PropsWithChildren, ReactElement } from 'react'

interface LocalStorageToggleProps extends PropsWithChildren {
  label: string
  value: string
  description?: string | ReactElement
  className?: string
  onClick?: React.MouseEventHandler<HTMLDivElement>
  onChange(value: string): void
  resetKey?: number
}

export const InputSelect: React.FC<LocalStorageToggleProps> = ({
  label,
  description = '',
  value,
  resetKey,
  onChange,
  children,
  ...props
}) => {
  const [internalValue, setInternalValue] = useState(value)

  useEffect(() => {
    setInternalValue(value)
  }, [resetKey, value])

  /**
   * Lowercase and no spaces
   */
  const id: string = useMemo(() => {
    return label.toLowerCase().replace(/\s/g, '-')
  }, [label])

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    const newValue = event.target.value
    setInternalValue(newValue)
    onChange(newValue)
  }

  return (
    <div {...props} className={`${props.className}`}>
      <InputLabel>{label}</InputLabel>
      <InputDescription>{description}</InputDescription>

      <select
        id={id}
        value={internalValue}
        onChange={handleChange}
        className='pa2 mt2 mb2'
      >
        {children}
      </select>
    </div>
  )
}
