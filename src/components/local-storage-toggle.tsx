/**
  Inspiration from https://dev.to/codebubb/create-a-simple-on-off-slide-toggle-with-css-db8
 */
import React, { useEffect, useState } from 'react'
import './local-storage-toggle.css'

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
      <span className='f5 ma0 pt3 teal fw4 db'>{label}</span>
      {(description.length > 0) ? <span className="charcoal-muted f6 fw1 db pt1 lh-copy mb2">{description}</span> : null}

      <input
        type="checkbox"
        id={localStorageKey}
        checked={isChecked}
        onChange={handleChange}
        className="dn"
      />
      <label
        htmlFor={localStorageKey}
        className={`relative dib h2 w3 flex-shrink-0 pointer br4 ${
          isChecked ? 'bg-green' : 'bg-light-gray'
        } transition-all duration-200 ease-in-out`}
      >
        <span
          className={`absolute top-0 left-0 dib h2 w2 br-100 bg-white shadow-1 ${
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
    localStorage.setItem(localStorageKey, String(defaultValue))
    return defaultValue
  }

  return savedValue === 'true'
}
