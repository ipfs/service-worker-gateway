/**
  Inspiration from https://dev.to/codebubb/create-a-simple-on-off-slide-toggle-with-css-db8
 */
import React, { useEffect, useState } from 'react'
import './local-storage-toggle.css'
import { InputDescription } from './input-description'
import { InputLabel } from './input-label'

interface LocalStorageToggleProps {
  label: string
  defaultValue: boolean
  description?: string
  localStorageKey: string
  className?: string
  onClick?: React.MouseEventHandler<HTMLDivElement>
  resetKey: number
}

export const LocalStorageToggle: React.FC<LocalStorageToggleProps> = ({
  label,
  description = '',
  defaultValue,
  resetKey,
  localStorageKey,
  ...props
}) => {
  const [isChecked, setIsChecked] = useState(() => {
    return getLocalStorageValue(localStorageKey, defaultValue)
  })

  useEffect(() => {
    setIsChecked(getLocalStorageValue(localStorageKey, defaultValue))
  }, [resetKey])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const newValue = event.target.checked
    setIsChecked(newValue)
    localStorage.setItem(localStorageKey, String(newValue))
  }

  return (
    <div {...props} className={`${props.className}`}>
      <InputLabel label={label} />
      <InputDescription description={description} />

      <input
        type="checkbox"
        id={localStorageKey}
        checked={isChecked}
        onChange={handleChange}
        className="dn"
      />
      <label
        htmlFor={localStorageKey}
        className={`relative dib h1 w2 flex-shrink-0 pointer br4 ${
          isChecked ? 'bg-green' : 'bg-dark-gray'
        } transition-all duration-200 ease-in-out`}
      >
        <span
          className={`absolute top-0 left-0 dib h1 w1 br-100 bg-white shadow-1 ${
            isChecked ? 'translate-x-100' : 'translate-x-0'
          } transition-transform duration-200 ease-in-out`}
        />
      </label>
    </div>
  )
}

function getLocalStorageValue (localStorageKey: string, defaultValue: boolean): boolean {
  const savedValue = localStorage.getItem(localStorageKey)
  if (savedValue == null) {
    return defaultValue
  }

  return savedValue === 'true'
}
