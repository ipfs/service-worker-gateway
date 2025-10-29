import React from 'react'
import ipfsLogo from '../ipfs-logo.svg'
import type { FunctionComponent } from 'react'

export interface HeaderProps extends React.HTMLProps<HTMLElement> {

}

export const Header: FunctionComponent<HeaderProps> = () => {
  return (
    <header className='e2e-header flex items-center pa2 bg-navy bb bw3 b--aqua tc justify-between'>
      <div>
        <a href='https://ipfs.tech' title='IPFS Project' target='_blank' rel='noopener noreferrer' aria-label="Open IPFS Project's website">
          <img alt='IPFS logo' src={ipfsLogo} style={{ height: 50 }} className='v-top' />
        </a>
      </div>
      <div className='pb1 ma0 inline-flex items-center'>
        <h1 className='e2e-header-title f3 fw2 aqua ttu sans-serif'>Service Worker Gateway <small className='gray'>(beta)</small></h1>
      </div>
    </header>
  )
}
export default Header
