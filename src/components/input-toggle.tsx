/**
  Inspiration from https://dev.to/codebubb/create-a-simple-on-off-slide-toggle-with-css-db8
 */
import React, { useMemo } from 'react'
import './input-toggle.css'
import { InputDescription } from './input-description.js'
import { InputLabel } from './input-label.js'

interface LocalStorageToggleProps {
  label: string
  value: boolean
  description?: string
  className?: string
  onClick?: React.MouseEventHandler<HTMLDivElement>
  onChange(value: boolean): void
  resetKey: number
}

export const InputToggle: React.FC<LocalStorageToggleProps> = ({
  label,
  description = '',
  value,
  resetKey,
  onChange,
  ...props
}) => {
  /**
   * Lowercase and no spaces
   */
  const id: string = useMemo(() => {
    return label.toLowerCase().replace(/\s/g, '-')
  }, [label])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const newValue = event.target.checked
    onChange(newValue)
  }

  return (
    <div {...props} className={`${props.className}`}>
      <InputLabel label={label} />
      <InputDescription description={description} />

      <input
        type="checkbox"
        id={id}
        checked={value}
        onChange={handleChange}
        className="dn"
      />
      <label
        htmlFor={id}
        className={`relative dib h1 w2 flex-shrink-0 pointer br4 ${
          value ? 'bg-green' : 'bg-dark-gray'
        } transition-all duration-200 ease-in-out`}
      >
        <span
          className={`absolute top-0 left-0 dib h1 w1 br-100 bg-white shadow-1 ${
            value ? 'translate-x-100' : 'translate-x-0'
          } transition-transform duration-200 ease-in-out`}
        />
      </label>
    </div>
  )
}
