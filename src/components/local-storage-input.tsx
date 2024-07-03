import React, { useEffect, useState } from 'react'

export interface LocalStorageInputProps extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> {
  localStorageKey: string
  label: string
  placeholder?: string
  defaultValue: string
  validationFn?(value: string): Error | null
  resetKey: number
}

const defaultValidationFunction = (value: string): Error | null => {
  try {
    value.split('\n')
    return null
  } catch (err) {
    return err as Error
  }
}

/**
 * A Local storage input (text area) component that saves the input to local storage.
 */
export default ({ resetKey, localStorageKey, label, placeholder, validationFn, defaultValue, ...props }: LocalStorageInputProps): JSX.Element => {
  const [value, setValue] = useState(localStorage.getItem(localStorageKey) ?? defaultValue)
  const [error, setError] = useState<null | Error>(null)

  useEffect(() => {
    setValue(localStorage.getItem(localStorageKey) ?? defaultValue)
  }, [resetKey])

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
    <div {...props}>
      <label htmlFor={localStorageKey} className='f5 ma0 pb2 aqua fw4 db'>{label}:</label>
      <textarea
        className='input-reset bn black-80 bg-white pa3 w-100 mb3'
        id={localStorageKey}
        name={localStorageKey}
        placeholder={placeholder}
        value={value}
        onChange={(e) => { setValue(e.target.value) }}
      />
      {error != null && <span style={{ color: 'red' }}>{error.message}</span>}
    </div>
  )
}
