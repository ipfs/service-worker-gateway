import React, { useState, useEffect } from 'react'

import Form from './components/Form.tsx'
import { ChannelActions, COLORS } from './lib/common.ts'
import { HeliaServiceWorkerCommsChannel } from './lib/channel.ts'
import type { OutputLine } from './components/types.ts'
import Header from './components/Header.tsx'
import CidRenderer from './components/CidRenderer'

const channel = new HeliaServiceWorkerCommsChannel('WINDOW')

function App (): JSX.Element {
  const [, setOutput] = useState<OutputLine[]>([])
  // const [fileCid, setFileCid] = useState(localStorage.getItem('helia-service-worker-gateway.forms.fileCid') ?? '')
  // const [cidPath, setCidPath] = useState(localStorage.getItem('helia-service-worker-gateway.forms.cidPath') ?? '')
  const [cidAndPath, setCidAndPath] = useState(localStorage.getItem('helia-service-worker-gateway.forms.cidAndPath') ?? '')

  useEffect(() => {
    localStorage.setItem('helia-service-worker-gateway.forms.cidAndPath', cidAndPath)
  }, [cidAndPath])

  const showStatus = (text: OutputLine['content'], color: OutputLine['color'] = COLORS.default, id: OutputLine['id'] = ''): void => {
    setOutput((prev: OutputLine[]) => {
      return [...prev,
        {
          content: text,
          color,
          id
        }
      ]
    })
  }

  const handleSubmit = async (e): Promise<void> => {
    e.preventDefault()
  }

  useEffect(() => {
    const onMsg = (event): void => {
      const { data } = event
      console.log('received message:', data)
      switch (data.action) {
        case ChannelActions.SHOW_STATUS:
          if (data.data.text.trim() !== '') {
            showStatus(`${data.source}: ${data.data.text}`, data.data.color, data.data.id)
          } else {
            showStatus('', data.data.color, data.data.id)
          }
          break
        default:
          console.log(`SW action ${data.action} NOT_IMPLEMENTED yet...`)
      }
    }
    channel.onmessage(onMsg)
  }, [channel])

  return (
    <>
      <Header />

      <main className='pa4-l bg-snow mw7 mv5 center pa4'>
        <h1 className='pa0 f2 ma0 mb4 aqua tc'>Fetch content from IPFS using Helia in a SW</h1>
        <Form
          handleSubmit={handleSubmit}
          cidAndPath={cidAndPath}
          setCidAndPath={setCidAndPath}
        />

        <div className="bg-snow mw7 center w-100">
          <CidRenderer cidAndPath={cidAndPath} />
        </div>

      </main>
    </>
  )
}

export default App
