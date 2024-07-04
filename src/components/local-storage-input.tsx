import React, { useEffect, useState } from 'react'

export interface LocalStorageInputProps extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> {
  localStorageKey: string
  label: string
  placeholder?: string
  defaultValue: string
  validationFn?(value: string): Error | null
  resetKey: number
  description?: string
  preSaveFormat?(value: string): string
  postLoadFormat?(value: string): string
}

const defaultValidationFunction = (value: string): Error | null => {
  try {
    value.split('\n')
    return null
  } catch (err) {
    return err as Error
  }
}

const getFromLocalStorage = (postLoadFormat?: (arg0: string) => string) => (key: string, fallback: string) => {
  let localStorageValue = localStorage.getItem(key)
  if (localStorageValue != null && postLoadFormat != null) {
    localStorageValue = postLoadFormat(localStorageValue)
  }
  return localStorageValue ?? fallback
}

/**
 * A Local storage input (text area) component that saves the input to local storage.
 */
export default ({ resetKey, localStorageKey, label, placeholder, validationFn, defaultValue, description, preSaveFormat, postLoadFormat, ...props }: LocalStorageInputProps): JSX.Element => {
  const localStorageLoadFn = getFromLocalStorage(postLoadFormat)
  const [value, setValue] = useState(localStorageLoadFn(localStorageKey, defaultValue))
  const [error, setError] = useState<null | Error>(null)

  useEffect(() => {
    setValue(localStorageLoadFn(localStorageKey, defaultValue))
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
      localStorage.setItem(localStorageKey, preSaveFormat?.(value) ?? value)
      setError(null)
    } catch (err) {
      setError(err as Error)
    }
  }, [value])

  props = {
    ...props,
    className: `${props.className ?? ''} flex-column items-start mb3`
  }

  return (
    <div {...props}>
      <label htmlFor={localStorageKey} className='f5 ma0 pt3 teal fw4 db'>{label}</label>
      <span className="charcoal-muted f6 fw1 db pt1 lh-copy">{description}</span>
        <textarea
          className='input-reset ba br2 b--light-silver code lh-copy black-80 bg-white pa2 w-100 mt2'
          id={localStorageKey}
          name={localStorageKey}
          placeholder={placeholder}
          value={value}
          onChange={(e) => { setValue(e.target.value) }}
        />
        {error != null && <span className='db lh-copy red pt1 tr f6 w-100'>⬑ {error.message}</span>}
    </div>
  )
}
