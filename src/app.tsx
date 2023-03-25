import React, { useState, useRef, useEffect } from 'react'

import Form from './components/Form.tsx'
import { ChannelActions, COLORS } from './lib/common.ts'
import { getHelia } from './get-helia.ts'
import { connectAndGetFile } from './lib/connectAndGetFile.ts'
import { HeliaServiceWorkerCommsChannel } from './lib/channel.ts'
import TerminalOutput from './components/TerminalOutput.tsx'
import type { OutputLine } from './components/types.ts'
import Header from './components/Header.tsx'
import type { Libp2pConfigTypes } from './types.ts'

const channel = new HeliaServiceWorkerCommsChannel('WINDOW')

function App (): JSX.Element {
  const [output, setOutput] = useState<OutputLine[]>([])
  const [fileCid, setFileCid] = useState(localStorage.getItem('helia-service-worker-gateway.forms.fileCid') ?? '')
  const [localMultiaddr, setLocalMultiaddr] = useState(localStorage.getItem('helia-service-worker-gateway.forms.localMultiaddr') ?? '')
  const [useServiceWorker, setUseServiceWorker] = useState(localStorage.getItem('helia-service-worker-gateway.forms.useServiceWorker') === 'true' ?? false)
  const [configType, setConfigType] = useState<Libp2pConfigTypes>('ipni')

  useEffect(() => {
    localStorage.setItem('helia-service-worker-gateway.forms.fileCid', fileCid)
  }, [fileCid])
  useEffect(() => {
    localStorage.setItem('helia-service-worker-gateway.forms.localMultiaddr', localMultiaddr)
  }, [localMultiaddr])
  useEffect(() => {
    localStorage.setItem('helia-service-worker-gateway.forms.useServiceWorker', useServiceWorker.toString())
  }, [useServiceWorker])

  const terminalRef = useRef<HTMLDivElement>(null)

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

    try {
      if (fileCid == null || fileCid.trim() === '') {
        throw new Error('File CID is missing...')
      }

      if (useServiceWorker) {
        showStatus('Fetching content using Service worker...', COLORS.active)
        channel.postMessage({ action: ChannelActions.GET_FILE, data: { fileCid, localMultiaddr, libp2pConfigType: configType } })
      } else {
        showStatus('Fetching content using main thread (no SW)...', COLORS.active)
        const helia = await getHelia({ libp2pConfigType: configType })
        showStatus(`Got helia with ${configType} libp2p config`)
        await connectAndGetFile({
          // need to use a separate channel instance because a BroadcastChannel instance won't listen to its own messages
          channel: new HeliaServiceWorkerCommsChannel('WINDOW'),
          localMultiaddr,
          fileCid,
          helia,
          action: ChannelActions.GET_FILE,
          cb: async ({ fileContent, action }) => {
            console.log('non-SW fileContent: ', fileContent)
          }
        })
      }
    } catch (err) {
      showStatus((err as Error)?.message, COLORS.error)
    }
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
        <h1 className='pa0 f2 ma0 mb4 aqua tc'>Fetch content from IPFS using Helia</h1>
        <Form
          handleSubmit={handleSubmit}
          fileCid={fileCid}
          setFileCid={setFileCid}
          localMultiaddr={localMultiaddr}
          setLocalMultiaddr={setLocalMultiaddr}
          useServiceWorker={useServiceWorker}
          setUseServiceWorker={setUseServiceWorker}
          configType={configType}
          setConfigType={setConfigType}
        />

        <h3>Output</h3>

        <div className='window'>
          <div className='header' />
          <TerminalOutput output={output} terminalRef={terminalRef} />
        </div>
      </main>
    </>
  )
}

export default App
