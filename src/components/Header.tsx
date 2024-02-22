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
        {/* https://isotropic.co/tool/hex-color-to-css-filter/ to #ffffff */}
        <img alt='Config gear icon' src={gearIcon} style={{ height: 50, filter: 'invert(100%) sepia(100%) saturate(0%) hue-rotate(275deg) brightness(103%) contrast(103%)' }} className='v-top' />
      </button>
    </header>
  )
}
