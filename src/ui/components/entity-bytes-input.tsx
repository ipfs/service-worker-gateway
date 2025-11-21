import React, { useState } from 'react'
import type { ReactElement } from 'react'

export interface EntityBytesInputProps {
  from: string
  to: string
  setFrom(from: string): void
  setTo(from: string): void
  setInvalid(invalid: boolean): void
}

export function EntityBytesInput ({ from, to, setFrom, setTo, setInvalid }: EntityBytesInputProps): ReactElement {
  const [fromValid, setFromValid] = useState(true)
  const [toValid, setToValid] = useState(true)

  function validate (val: string, which: 'from' | 'to'): void {
    const setValid = which === 'from' ? setFromValid : setToValid
    const set = which === 'from' ? setFrom : setTo

    set(val)

    if (val === '*' || Number.isInteger(Number(val))) {
      setValid(true)
      setInvalid(false)
    } else {
      setValid(false)
      setInvalid(true)
    }
  }

  let errorMessage = <></>

  if (!fromValid || !toValid) {
    errorMessage = (
      <>
        <span className='pb3 pa3 db bg-light-yellow'>
          "From" and "to" values must be '*' or a positive/negative integer
        </span>
      </>
    )
  }

  return (
    <>
      <span className='mt2 mb2 db'>
        <input
          className='input-reset bn black-80 bg-white pa3 w-10 mb3 mr2'
          id='entity-bytes-from'
          name='entity-bytes-from'
          type='text'
          placeholder='From'
          required
          value={from}
          onChange={(e) => validate(e.target.value, 'from')}
        />
        <input
          className='input-reset bn black-80 bg-white pa3 w-10 mb3'
          id='entity-bytes-to'
          name='entity-bytes-to'
          type='text'
          placeholder='To'
          required
          value={to}
          onChange={(e) => validate(e.target.value, 'to')}
        />
      </span>
      {errorMessage}
    </>
  )
}
