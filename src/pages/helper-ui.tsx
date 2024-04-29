import React, { useState, useEffect } from 'react'
import Form from '../components/Form.jsx'
import Header from '../components/Header.jsx'
import CidRenderer from '../components/input-validator.jsx'
import { ConfigProvider } from '../context/config-context.jsx'
import { ServiceWorkerProvider } from '../context/service-worker-context.jsx'
import { LOCAL_STORAGE_KEYS } from '../lib/local-storage.js'

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
        <aside className='mw7 center w-100 lh-copy'>
          <p>
            <a href="https://github.com/ipfs-shipyard/service-worker-gateway">IPFS Service Worker Gateway</a> facilitates verified retrieval of content-addressed data with <a href="https://github.com/ipfs/helia">Helia</a> and the <a href="https://github.com/ipfs/helia-verified-fetch"><pre className="di">@helia/verified-fetch</pre></a> library within a <a href="https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API">Service Worker</a>. You can use it to securely load dApps and content-addressable (CID) data in the browser. This project is still under heavy development and not 100% fully compliant with <a href="https://specs.ipfs.tech/http-gateways/">IPFS Gateway Specs</a> (verified with <a href="https://github.com/ipfs/gateway-conformance">gateway conformance tests</a>).
          </p>
          <p>If you have a problem, <a href="https://github.com/ipfs-shipyard/service-worker-gateway/issues/new">report issues in the Github repository</a>.</p>
          <p>You can track our efforts to make it production ready at <a href="https://github.com/ipfs-shipyard/service-worker-gateway/milestones">https://github.com/ipfs-shipyard/service-worker-gateway/milestones</a>.</p>
        </aside>
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
