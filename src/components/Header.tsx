import React from 'react'
import { RouteContext } from '../context/router-context.jsx'
import gearIcon from '../gear-icon.svg'
import ipfsLogo from '../ipfs-logo.svg'

export default function Header (): JSX.Element {
  const { gotoPage } = React.useContext(RouteContext)
  return (
    <header className='e2e-header flex items-center pa2 bg-navy bb bw3 b--aqua tc justify-between'>
      <div>
        <a href='https://ipfs.tech' title='IPFS Project' target="_blank" rel="noopener noreferrer" aria-label="Open IPFS Project's website">
            <img alt='IPFS logo' src={ipfsLogo} style={{ height: 50 }} className='v-top' />
        </a>
      </div>
      <div className='pb1 ma0 inline-flex items-center'>
        <h1 className='e2e-header-title f3 fw2 aqua ttu sans-serif'>Service Worker Gateway <small className="gray">(beta)</small></h1>
        <button className='e2e-header-config-button pl3'
            onClick={() => {
              gotoPage('/ipfs-sw-config')
            }}
            style={{ border: 'none', background: 'none', cursor: 'pointer' }}
        >
            <img alt='Config gear icon' src={gearIcon} style={{ height: 50 }} className='v-top' />
        </button>
      </div>

    </header>
  )
}
