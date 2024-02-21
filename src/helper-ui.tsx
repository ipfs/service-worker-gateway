import React, { useState, useEffect } from 'react'
import CidRenderer from './components/CidRenderer.tsx'
import Form from './components/Form.tsx'
import Header from './components/Header.tsx'
import { LOCAL_STORAGE_KEYS } from './lib/local-storage.ts'

export default function (): JSX.Element {
  const [requestPath, setRequestPath] = useState(localStorage.getItem(LOCAL_STORAGE_KEYS.forms.requestPath) ?? '')

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.forms.requestPath, requestPath)
  }, [requestPath])

  const handleSubmit = async (e): Promise<void> => {
    e.preventDefault()
  }

  return (
    <>
      <Header />
      <main className='pa4-l bg-snow mw7 mv5 center pa4'>
        <h1 className='pa0 f2 ma0 mb4 aqua tc'>Fetch content from IPFS using Helia in a SW</h1>
        <Form
          handleSubmit={handleSubmit}
          requestPath={requestPath}
          setRequestPath={setRequestPath}
        />

        <div className="bg-snow mw7 center w-100">
          <CidRenderer requestPath={requestPath} />
        </div>

      </main>
    </>
  )
}
