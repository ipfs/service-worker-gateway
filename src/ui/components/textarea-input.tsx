import React, { useCallback, useEffect, useState } from 'react'
import { InputDescription } from './input-description.jsx'
import { InputLabel } from './input-label.jsx'
import type { ReactElement } from 'react'

export interface InputProps extends Omit<React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>, 'onChange'> {
  label: string
  placeholder?: string
  value: string
  validationFn?(value: string): Error | null
  resetKey: number
  description?: string
  preSaveFormat?(value: string): any
  onChange(value: string): void
}

export default ({ resetKey, onChange, label, placeholder, validationFn, value, description, preSaveFormat, ...props }: InputProps): ReactElement => {
  const [internalValue, setInternalValue] = useState(value)
  const [error, setError] = useState<null | Error>(null)

  useEffect(() => {
    setInternalValue(value)
  }, [resetKey, value])

  const updateValue = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInternalValue(e.target.value)
  }, [])

  const saveValue = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    try {
      const err = validationFn?.(newValue)
      if (err != null) {
        throw err
      }
      setInternalValue(newValue)

      onChange(preSaveFormat?.(newValue) ?? newValue)
      setError(null)
    } catch (err) {
      setError(err as Error)
    }
  }, [onChange, preSaveFormat, validationFn])

  props = {
    ...props,
    className: `${props.className ?? ''} flex-column items-start`
  }

  return (
    <div {...props}>
      <InputLabel>{label}</InputLabel>
      <InputDescription>{description}</InputDescription>
      <textarea
        className='input-reset ba br2 b--light-silver code lh-copy black-80 bg-white pa2 w-100 mt2'
        id={label}
        name={label}
        placeholder={placeholder}
        value={internalValue}
        onChange={updateValue}
        onBlur={saveValue}
      />
      {error != null && <span className='db lh-copy red pt1 tr f6 w-100'>⬑ {error.message}</span>}
    </div>
  )
}
