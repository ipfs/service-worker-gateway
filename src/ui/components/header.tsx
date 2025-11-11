import React from 'react'
import { FaInfoCircle, FaCog, FaGithub } from 'react-icons/fa'
import ipfsLogo from '../ipfs-logo.svg'
import type { FunctionComponent } from 'react'

function toAbsolutePath (path: string): string {
  if (path.startsWith('./')) {
    return path.substring(1)
  }

  return path
}

export interface HeaderProps extends React.HTMLProps<HTMLElement> {
  onShowAbout(): void
  onShowSettings(): void
}

export const Header: FunctionComponent<HeaderProps> = ({ onShowAbout, onShowSettings }) => {
  return (
    <header className='e2e-header flex items-center pa2 bg-navy bb bw3 b--aqua tc justify-between'>
      <div>
        <a href='https://ipfs.tech' title='IPFS Project' target='_blank' rel='noopener noreferrer' aria-label='Visit the website of the IPFS Project'>
          <img alt='IPFS logo' src={toAbsolutePath(ipfsLogo)} style={{ height: 50 }} className='v-top' />
        </a>
      </div>
      <div className='pb1 ma0 inline-flex items-center'>
        <h1 className='e2e-header-title f3 fw2 aqua ttu sans-serif'>Service Worker Gateway</h1>
        <FaInfoCircle className='ml2 f3 aqua' />
        <FaCog className='ml2 f3 aqua' />
        <a href='https://github.com/ipfs/service-worker-gateway' title='IPFS Service Worker Gateway on GitHub' target='_blank' rel='noopener noreferrer' aria-label='Visit the GitHub repository for the IPFS Service Worker Gateway'>
          <FaGithub className='ml2 f3 aqua' />
        </a>
      </div>
    </header>
  )
}
export default Header
