import React, { useContext } from 'react'
import { ConfigContext } from '../context/config-context.tsx'
import gearIcon from '../gear-icon.svg'
import ipfsLogo from '../ipfs-logo.svg'

export default function Header (): JSX.Element {
  const { isConfigExpanded, setConfigExpanded } = useContext(ConfigContext)

  return (
    <header className='flex items-center pa3 bg-navy bb bw3 b--aqua'>
      <a href='https://ipfs.io' title='home'>
        <img alt='IPFS logo' src={ipfsLogo} style={{ height: 50 }} className='v-top' />
      </a>

      <button onClick={() => { setConfigExpanded(!isConfigExpanded) }} style={{ border: 'none', position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'none', cursor: 'pointer' }}>
        <img alt='Config gear icon' src={gearIcon} style={{ height: 50 }} className='v-top' />
      </button>
    </header>
  )
}
