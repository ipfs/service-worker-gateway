import React, { useEffect, useState } from 'react'

export interface LocalStorageInputProps {
  localStorageKey: string
  label: string
  placeholder?: string
  defaultValue: string
  validationFn?(value: string): Error | null
}

const defaultValidationFunction = (value: string): Error | null => {
  try {
    JSON.parse(value)
    return null
  } catch (err) {
    return err as Error
  }
}
export default ({ localStorageKey, label, placeholder, validationFn, defaultValue }: LocalStorageInputProps): JSX.Element => {
  const [value, setValue] = useState(localStorage.getItem(localStorageKey) ?? defaultValue)
  const [error, setError] = useState<null | Error>(null)

  if (validationFn == null) {
    validationFn = defaultValidationFunction
  }

  useEffect(() => {
    try {
      const err = validationFn?.(value)
      if (err != null) {
        throw err
      }
      localStorage.setItem(localStorageKey, value)
      setError(null)
    } catch (err) {
      setError(err as Error)
    }
  }, [value])

  return (
    <>
      <label htmlFor={localStorageKey} className='f5 ma0 pb2 aqua fw4 db'>{label}:</label>
      <input
        className='input-reset bn black-80 bg-white pa3 w-100 mb3'
        id={localStorageKey}
        name={localStorageKey}
        type='text'
        placeholder={placeholder}
        value={value}
        onChange={(e) => { setValue(e.target.value) }}
      />
      {error != null && <span style={{ color: 'red' }}>{error.message}</span>}
    </>
  )
}
