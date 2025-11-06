import React from 'react'
import { Link } from '../components/link.js'
import type { ReactElement } from 'react'

export default function About (): ReactElement {
  return (
    <div className='e2e-section-about pa4-l bg-snow mw7 mv4-l center pa4 br2'>
      <h1 className='pa0 f3 ma0 mb4 teal tc'>About the IPFS Gateway and Service Worker</h1>
      <p className='charcoal f6 fw1 db pt1 lh-copy mb2'>This page runs an IPFS gateway within a <Link href='https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API'>Service Worker</Link>. It uses <Link href='https://github.com/ipfs/helia'>Helia</Link> (IPFS implementation in JS) and the <Link href='https://github.com/ipfs/helia-verified-fetch'>@helia/verified-fetch</Link> library (<Link href='https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API'>Fetch API</Link> for IPFS) to facilitate direct verified retrieval of <Link href='https://docs.ipfs.tech/concepts/content-addressing/'>content-addressed</Link> data.</p>
      <p className='charcoal f6 fw1 db pt1 lh-copy mb2'><span className='f5 ma0 pt3 teal fw4 db'>Why?</span> It improves decentralization, offers enhanced security (CID verification happens on end user's machine) and reliability (ability to do retrieval from multiple sources without reliance on a single HTTP server).</p>
      <p className='charcoal f6 fw1 db pt1 lh-copy mb2'><span className='f5 ma0 pt3 teal fw4 db'>How does it work?</span> A Service Worker is registered on the initial page load, and then intercepts HTTP requests for content stored on <Link href='https://docs.ipfs.tech/how-to/address-ipfs-on-web/'>IPFS paths</Link> such as <code>/ipfs/*</code> (immutable) and <code>/ipns/*</code> (mutable), takes care of IPFS retrieval, verification, UnixFS deserialization, and returns Response objects to the browser.</p>
      <p className='charcoal f6 fw1 db pt1 lh-copy mb2'><span className='f5 ma0 pt3 teal fw4 db'>Is this production ready?</span> This project is under heavy development and is not yet fully compliant with <Link href='https://specs.ipfs.tech/http-gateways/'>IPFS Gateway Specfications</Link>. Track our efforts  <Link href='https://github.com/ipfs/service-worker-gateway/milestones'>here</Link>.</p>
      <p className='charcoal f6 fw1 db pt1 lh-copy mb2'><span className='f5 ma0 pt3 teal fw4 db'>Want to report abuse?</span> This gateway uses the <Link href='https://badbits.dwebops.pub/'>Bad Bits</Link> blocklist. To report harmful content, <Link href='https://badbits.dwebops.pub/#reporting'>submit it there</Link>.</p>
      <p className='charcoal f6 fw1 db pt1 lh-copy mb2'><span className='f5 ma0 pt3 teal fw4 db'>Found a bug?</span> We welcome you to report it by <Link href='https://github.com/ipfs/service-worker-gateway/issues/new'>opening an issue</Link> with details like an address and a screenshot.</p>
    </div>
  )
}
