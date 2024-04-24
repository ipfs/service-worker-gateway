/**
  Inspiration from https://dev.to/codebubb/create-a-simple-on-off-slide-toggle-with-css-db8
 */
import React, { useState } from 'react'
import './local-storage-toggle.css'

interface LocalStorageToggleProps extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> {
  localStorageKey: string
  offLabel: string
  onLabel: string
}

export const LocalStorageToggle: React.FC<LocalStorageToggleProps> = ({ localStorageKey, onLabel = 'Off', offLabel = 'On', ...props }) => {
  const [isChecked, setIsChecked] = useState(() => {
    const savedValue = localStorage.getItem(localStorageKey)
    return savedValue === 'true'
  })

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const newValue = event.target.checked
    setIsChecked(newValue)
    localStorage.setItem(localStorageKey, String(newValue))
  }

  return (
    <div {...props} className={`${props.className} local-storage-toggle input-reset bn black-80 w-100 mb3`}>
      <input className="status" style={{ display: 'none' }} id={localStorageKey} type="checkbox" name="status" checked={isChecked} onChange={handleChange} />
      <label htmlFor={localStorageKey} className="w-100 h-100">
        <div className="status-switch relative h3-custom pointer white bg-gray w-100" data-unchecked={offLabel} data-checked={onLabel} />
      </label>
    </div>
  )
}
