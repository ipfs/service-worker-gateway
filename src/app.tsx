import React, { useState, useRef } from 'react';
import type { Helia } from '@helia/interface'
import { unixfs } from '@helia/unixfs'
import { CID } from 'multiformats/cid'

import { getHelia } from './get-helia.ts'
import Form from './components/Form.tsx';
import TerminalOutput from './components/TerminalOutput.tsx';
import Header from './components/Header.tsx';
import { mergeUint8Arrays } from './lib';

enum COLORS {
  default = '#fff',
  active = '#357edd',
  success = '#0cb892',
  error = '#ea5037'
}

interface OutputLine {
  content: string
  color: COLORS
  id: string
}

function App() {
  const [output, setOutput] = useState<OutputLine[]>([]);
  const [helia, setHelia] = useState<Helia | null>(null);
  const [fileCid, setFileCid] = useState('QmXuk2793cGXBkPQ2FCEBZVe5KsKDnBi2QyhbEZwxXZb5Y');

  const terminalEl = useRef<HTMLDivElement>(null);

  const showStatus = (text: OutputLine['content'], color: OutputLine['color'] = COLORS.default, id: OutputLine['id'] = '') => {
    setOutput((prev: OutputLine[]) => {
      return [...prev,
        {
        'content': text,
        'color': color,
        'id': id
        }
      ]
    })

    terminalEl.current?.scroll?.({ top: terminalEl.current?.scrollHeight, behavior: 'smooth' })
  }

  const getFile = async (fileCid) => {
    let node = helia;

    if (!helia || node == null) {
      showStatus('Creating Helia node...', COLORS.active)

      node = await getHelia()

      globalThis.helia = node
      setHelia(node)
        node.libp2p.addEventListener('peer:discovery', (evt) => {
          console.log(`Discovered peer ${evt.detail.id.toString()}`)
        })
        node.libp2p.addEventListener('peer:connect', (evt) => {
          console.log(`Connected to peer ${evt.detail.remotePeer.toString()}`)
        })
        node.libp2p.addEventListener('peer:disconnect', (evt) => {
          console.log(`Disconnected from peer ${evt.detail.remotePeer.toString()}`)
        })
    }

    const peerId = node.libp2p.peerId
    console.log(peerId)
    showStatus(`My ID is ${peerId}`, COLORS.active, peerId.toString())

    const fs = unixfs(node)
    const cid = CID.parse(fileCid)
    console.log(`cid: `, cid);

    showStatus(`Reading UnixFS file ${cid}...`, COLORS.active)
    const decoder = new TextDecoder()
    const decodedTextChunks: string[] = []
    let encodedChunks: Uint8Array = new Uint8Array()

    for await (const chunk of fs.cat(cid)) {
      encodedChunks = mergeUint8Arrays(encodedChunks, chunk)
      console.log(`encodedChunks: `, encodedChunks);
      const decodedData = decoder.decode(chunk, {
        stream: true
      })
      showStatus('Received Chunk: ' + decodedData, COLORS.active)
      decodedTextChunks.push(decodedData)
    }
    console.log(`Final encodedChunks: `, encodedChunks);
    showStatus(`Final data: ${decodedTextChunks.join('')}`, COLORS.success)
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (fileCid == null || fileCid.trim() === '') {
        throw new Error('File CID is missing...')
      }

      await getFile(fileCid)
    } catch (err) {
      showStatus((err as Error)?.message, COLORS.error)
    }
  }

  return (
    <>
      <Header />
      <main className="pa4-l bg-snow mw7 mv5 center pa4">
        <h1 className="pa0 f2 ma0 mb4 aqua tc">Fetch unixFs file content from IPFS using Helia</h1>
        <Form handleSubmit={handleSubmit} fileCid={fileCid} setFileCid={setFileCid} />

        <h3>Output</h3>

        <div className="window">
          <div className="header"></div>
          <TerminalOutput terminalRef={terminalEl} output={output} />
        </div>
      </main>
    </>
  );
}

export default App;
