import React, { useState, useRef } from 'react';
import type { Helia } from '@helia/interface'
import { AddOptions, unixfs } from '@helia/unixfs'
import { CID } from 'multiformats/cid'

import { getHelia } from './get-helia.ts'
import ipfsLogo from './ipfs-logo.svg'
import Form from './form';

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
  const [fileCid, setFileCid] = useState('');


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

  // const store = async (name, content) => {
  //   let node: Helia | null = helia;

  //   if (!helia) {
  //     showStatus('Creating Helia node...', COLORS.active)

  //     node = await getHelia()

  //     setHelia(node)
  //   }

  //   if (node == null) {
  //     throw new Error('Helia node is not available')
  //   }

  //   const peerId = node.libp2p.peerId
  //   console.log(peerId)
  //   showStatus(`My ID is ${peerId}`, COLORS.active, peerId.toString())

  //   const encoder = new TextEncoder()

  //   // const fileToAdd = {
  //   //   path: `${name}`,
  //   //   content: encoder.encode(content)
  //   // }

  //   const fs = unixfs(node)

  //   showStatus(`Adding file ${fileToAdd.path}...`, COLORS.active)
  //   const cid = await fs.addFile(fileToAdd, node.blockstore as Partial<AddOptions>)

  //   showStatus(`Added to ${cid}`, COLORS.success, cid.toString())
  //   showStatus('Reading file...', COLORS.active)
  //   const decoder = new TextDecoder()
  //   let text = ''

  //   for await (const chunk of fs.cat(cid)) {
  //     text += decoder.decode(chunk, {
  //       stream: true
  //     })
  //   }

  //   showStatus(`\u2514\u2500 ${name} ${text}`)
  //   showStatus(`Preview: https://ipfs.io/ipfs/${cid}`, COLORS.success)
  // }

  const getFile = async (fileCid) => {
    let node = helia;

    if (!helia || node == null) {
      showStatus('Creating Helia node...', COLORS.active)

      node = await getHelia()

      globalThis.helia = node
      setHelia(node)
    }

    // if (node == null) {
    //   throw new Error('Helia node is not available')
    // }


    const peerId = node.libp2p.peerId
    console.log(peerId)
    showStatus(`My ID is ${peerId}`, COLORS.active, peerId.toString())

    const fs = unixfs(node)
    const cid = CID.parse(fileCid)

    showStatus(`Reading UnixFS text file ${cid}...`, COLORS.active)
    const decoder = new TextDecoder()
    let text = ''

    for await (const chunk of fs.cat(cid)) {
      text += decoder.decode(chunk, {
        stream: true
      })
    }

    showStatus(`\u2514\u2500 CID: ${cid}`)
    showStatus(`${text}`, COLORS.success)
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
      <header className='flex items-center pa3 bg-navy bb bw3 b--aqua'>
        <a href='https://ipfs.io' title='home'>
          <img alt='IPFS logo' src={ipfsLogo} style={{ height: 50 }} className='v-top' />
        </a>
      </header>

      <main className="pa4-l bg-snow mw7 mv5 center pa4">
        <h1 className="pa0 f2 ma0 mb4 aqua tc">Fetch content from IPFS using Helia</h1>
        <Form handleSubmit={handleSubmit} fileCid={fileCid} setFileCid={setFileCid} />

        <h3>Output</h3>

        <div className="window">
          <div className="header"></div>
          <div id="terminal" className="terminal" ref={terminalEl}>
            { output.length > 0 &&
              <div id="output">
                { output.map((log, index) =>
                  <p key={index} style={{'color': log.color}} id={log.id}>
                    {log.content}
                  </p>)
                }
              </div>
            }
          </div>
        </div>
      </main>
    </>
  );
}

export default App;
