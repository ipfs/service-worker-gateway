import React from 'react'
import Libp2pConfigTypes from './Libp2pConfigTypes'

export default ({ handleSubmit, fileCid, setFileCid, localMultiaddr, setLocalMultiaddr, useServiceWorker, setUseServiceWorker, configType, setConfigType }): JSX.Element => (
  <form id='add-file' onSubmit={handleSubmit}>
    <label htmlFor='local-multiaddr' className='f5 ma0 pb2 aqua fw4 db'>Local multiaddr (e.g. webtransport multiaddr for your kubo node)</label>
    <input
      className='input-reset bn black-80 bg-white pa3 w-100 mb3'
      id='local-multiaddr'
      name='local-multiaddr'
      type='text'
      placeholder='/ip4/127.0.0.1/udp/4001/quic-v1/webtransport/certhash/XXXXXX/certhash/XXXXXX/p2p/YourLocalKuboPeerId'
      value={localMultiaddr} onChange={(e) => setLocalMultiaddr(e.target.value)}
    />
    <label htmlFor='file-name' className='f5 ma0 pb2 aqua fw4 db'>CID</label>
    <input
      className='input-reset bn black-80 bg-white pa3 w-100 mb3'
      id='file-name'
      name='file-name'
      type='text'
      placeholder='bafk...'
      required
      value={fileCid} onChange={(e) => setFileCid(e.target.value)}
    />
    <label htmlFor='useServiceWorker' className='f5 ma0 pb2 aqua fw4 db'>Use Service Worker
      <input
        className='ml2'
        id='useServiceWorker'
        name='useServiceWorker'
        type='checkbox'
        checked={useServiceWorker} onChange={(e) => setUseServiceWorker(e.target.checked)}
      />
    </label>
    <Libp2pConfigTypes configType={configType} setConfigType={setConfigType}/>

    <button
      className='button-reset pv3 tc bn bg-animate bg-black-80 hover-bg-aqua white pointer w-100'
      id='add-submit'
      type='submit'
    >
      Fetch
    </button>
  </form>
)
