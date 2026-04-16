import React from 'react'
import { Link } from '../components/link.tsx'
import type { ReactElement } from 'react'

export default function About (): ReactElement {
  return (
    <div className='e2e-section-about pa4-l bg-snow mw7 mv4-l center pa4 br2'>
      <h1 className='pa0 f3 ma0 mb4 teal tc'>About the IPFS Gateway and Service Worker</h1>
      <p className='charcoal db pt1 lh-copy mb2'>This page runs an <Link href='https://specs.ipfs.tech/http-gateways'>IPFS HTTP Gateway</Link> within a <Link href='https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API'>Service Worker</Link>. It uses the <Link href='https://github.com/ipfs/helia-verified-fetch'>@helia/verified-fetch</Link> library to retrieve <Link href='https://docs.ipfs.tech/concepts/content-addressing/'>content-addressed</Link> data directly from the IPFS network.</p>
      <p className='charcoal db pt1 lh-copy mb2'><span className='f5 ma0 pt3 teal fw4 db'>Why?</span> Centralized IPFS HTTP gateways encourage reliance on third parties who may not exist forever.</p>
      <p className='charcoal db pt1 lh-copy mb2'>Instead, running your own <Link href='https://github.com/ipfs/helia'>Helia</Link> node in a service worker improves decentralization since it is able to fetch content directly from other IPFS nodes.</p>
      <p className='charcoal db pt1 lh-copy mb2'>It offers better security over regular HTTP as downloaded data is verified against the hash contained within the requested CID, and also enhanced reliability because it is able to perform retrieval from multiple providers over multiple transports.</p>
      <p className='charcoal db pt1 lh-copy mb2'>All downloaded files are added to the browser cache which encourages data resilience and also makes them available for offline use.</p>
      <p className='charcoal db pt1 lh-copy mb2'><span className='f5 ma0 pt3 teal fw4 db'>How does it work?</span> A Service Worker is registered on the initial page load, and then intercepts HTTP requests for content stored on <Link href='https://docs.ipfs.tech/how-to/address-ipfs-on-web/'>IPFS paths</Link> such as <code>/ipfs/*</code> (immutable) and <code>/ipns/*</code> (mutable). It takes care of IPFS retrieval, verification, UnixFS deserialization, and returns Response objects to the browser.</p>
      <p className='charcoal db pt1 lh-copy mb2'><span className='f5 ma0 pt3 teal fw4 db'>Is this production ready?</span> This project is under heavy development and is not yet fully compliant with <Link href='https://specs.ipfs.tech/http-gateways/'>IPFS Gateway Specifications</Link>. Track our efforts  <Link href='https://github.com/ipfs/service-worker-gateway/milestones'>here</Link>.</p>
      <p className='charcoal db pt1 lh-copy mb2'><span className='f5 ma0 pt3 teal fw4 db'>Want to report abuse?</span> This gateway uses the <Link href='https://badbits.dwebops.pub/'>Bad Bits</Link> blocklist. To report harmful content, <Link href='https://badbits.dwebops.pub/#reporting'>submit it there</Link>.</p>
      <p className='charcoal db pt1 lh-copy mb2'><span className='f5 ma0 pt3 teal fw4 db'>Found a bug?</span> We welcome you to report it by <Link href='https://github.com/ipfs/service-worker-gateway/issues/new'>opening an issue</Link> with details like an address and a screenshot.</p>
    </div>
  )
}
