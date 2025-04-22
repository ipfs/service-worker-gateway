import React, { useCallback, useEffect, useState, type ReactElement } from 'react'
import { InputDescription } from './input-description.jsx'
import { InputLabel } from './input-label.jsx'

export interface InputProps extends Omit<React.DetailedHTMLProps<React.HTMLAttributes<HTMLInputElement>, HTMLInputElement>, 'onChange'> {
  label: string
  placeholder?: string
  value: number
  validationFn?(value: number): Error | null
  resetKey: number
  description?: string
  preSaveFormat?(value: number): any
  onChange(value: number): void
  /**
   * The step value for the input. Defaults to '1'.
   */
  step?: string
}

export default ({ resetKey, onChange, label, placeholder, validationFn, value, description, preSaveFormat, step = '1', ...props }: InputProps): ReactElement => {
  const [internalValue, setInternalValue] = useState(value)
  const [error, setError] = useState<null | Error>(null)

  useEffect(() => {
    setInternalValue(value)
  }, [resetKey, value])

  const updateValue = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInternalValue(parseFloat(e.target.value))
  }, [])

  const saveValue = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value)
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
      <InputLabel label={label} />
      <InputDescription description={description} />
        <input
          type='number'
          step={step}
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
