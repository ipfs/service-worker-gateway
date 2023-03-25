import React from 'react'

import ipfsLogo from '../ipfs-logo.svg'

export default function Header (): JSX.Element {
  return (
    <header className='flex items-center pa3 bg-navy bb bw3 b--aqua'>
      <a href='https://ipfs.io' title='home'>
        <img alt='IPFS logo' src={ipfsLogo} style={{ height: 50 }} className='v-top' />
      </a>
    </header>
  )
}
