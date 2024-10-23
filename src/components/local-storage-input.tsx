import React, { useCallback, useEffect, useState } from 'react'
import { InputDescription } from './input-description'
import { InputLabel } from './input-label'

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

  const saveValue = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    try {
      const err = validationFn?.(newValue)
      if (err != null) {
        throw err
      }
      setValue(newValue)
      localStorage.setItem(localStorageKey, preSaveFormat?.(newValue) ?? newValue)
      setError(null)
    } catch (err) {
      setError(err as Error)
    }
  }, [validationFn, localStorageKey, preSaveFormat])

  props = {
    ...props,
    className: `${props.className ?? ''} flex-column items-start mb3`
  }

  return (
    <div {...props}>
      <InputLabel label={label} />
      <InputDescription description={description} />
        <textarea
          className='input-reset ba br2 b--light-silver code lh-copy black-80 bg-white pa2 w-100 mt2'
          id={localStorageKey}
          name={localStorageKey}
          placeholder={placeholder}
          value={value}
          onChange={saveValue}
        />
        {error != null && <span className='db lh-copy red pt1 tr f6 w-100'>⬑ {error.message}</span>}
    </div>
  )
}
