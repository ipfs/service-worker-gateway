import React, { useState, useEffect } from 'react'
import About from '../components/About.jsx'
import Form from '../components/Form.jsx'
import Header from '../components/Header.jsx'
import CidRenderer from '../components/input-validator.jsx'
import { ConfigProvider } from '../context/config-context.jsx'
import { ServiceWorkerProvider } from '../context/service-worker-context.jsx'
// import { isConfigPage } from '../lib/is-config-page'
import { LOCAL_STORAGE_KEYS } from '../lib/local-storage.js'
import './default-page-styles.css'
import Config from './config.js'

function HelperUi (): React.JSX.Element {
  const [requestPath, setRequestPath] = useState(localStorage.getItem(LOCAL_STORAGE_KEYS.forms.requestPath) ?? '')

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.forms.requestPath, requestPath)
  }, [requestPath])

  const handleSubmit = async (e): Promise<void> => {
    e.preventDefault()
  }

  // if (isConfigPage(window.location.hash)) {
  //   // when user on a subdomain explicitly requests /#/ipfs-sw-config
  //   return (
  //     <>
  //       <Header />
  //       <Config />
  //     </>
  //   )
  // }

  return (
    <>
      <Header />
      <main className='pa2 pa4-l bg-snow mw7 mv5-l center e2e-helper-ui'>
        <h1 className='pa0 f3 ma0 mb4 teal tc'>Fetch & Verify IPFS Content in Browser</h1>
        <Form
          handleSubmit={handleSubmit}
          requestPath={requestPath}
          setRequestPath={setRequestPath}
        />

        <div className="bg-snow mw7 center w-100">
          <CidRenderer requestPath={requestPath} />
        </div>

      </main>

      <About />
      <Config/>
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
