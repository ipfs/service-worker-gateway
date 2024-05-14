import React, { useState, useEffect } from 'react'
import Form from '../components/Form.jsx'
import Header from '../components/Header.jsx'
import CidRenderer from '../components/input-validator.jsx'
import { ConfigProvider } from '../context/config-context.jsx'
import { ServiceWorkerProvider } from '../context/service-worker-context.jsx'
import { LOCAL_STORAGE_KEYS } from '../lib/local-storage.js'
import './default-page-styles.css'

function HelperUi (): React.JSX.Element {
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
        <h1 className='pa0 f2 ma0 mb4 aqua tc'>Fetch & Verify IPFS content with a Service Worker</h1>
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

export default (): React.JSX.Element => {
  return (
    <ServiceWorkerProvider>
      <ConfigProvider>
        <HelperUi />
      </ConfigProvider>
    </ServiceWorkerProvider>
  )
}
