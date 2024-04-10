import React from 'preact/compat'
import { RouteContext } from '../context/router-context.jsx'
import gearIcon from '../gear-icon.svg'
import ipfsLogo from '../ipfs-logo.svg'

export default function Header (): JSX.Element {
  const { gotoPage } = React.useContext(RouteContext)
  return (
    <header className='e2e-header flex items-center pa3 bg-navy bb bw3 b--aqua justify-between'>
      <a href='https://ipfs.io' title='home'>
        <img alt='IPFS logo' src={ipfsLogo} style={{ height: 50 }} className='v-top' />
      </a>
      <span className='e2e-header-title white f3'>IPFS Service Worker Gateway</span>
      <button className='e2e-header-config-button'
        onClick={() => {
          // window.history.pushState(null, '', '/#/ipfs-sw-config')
          // window.location.hash = '#/ipfs-sw-config'
          // window.location.reload()
          gotoPage('/ipfs-sw-config')
        }}
        style={{ border: 'none', background: 'none', cursor: 'pointer' }}
      >
        {/* https://isotropic.co/tool/hex-color-to-css-filter/ to #ffffff */}
        <img alt='Config gear icon' src={gearIcon} style={{ height: 50, filter: 'invert(100%) sepia(100%) saturate(0%) hue-rotate(275deg) brightness(103%) contrast(103%)' }} className='v-top' />
      </button>
    </header>
  )
}
