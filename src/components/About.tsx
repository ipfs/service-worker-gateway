import React from 'react'

export default function About (): JSX.Element {
  return (
        <aside className='mw7 lb-snow center w-100 lh-copy pa2'>
          <h1 className='pa0 f3 ma0 mb4 teal tc'>About the IPFS Gateway and Service Worker</h1>
          <p>This page runs an IPFS gateway within a <a href="https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API" target="_blank">Service Worker</a>. It uses <a href="https://github.com/ipfs/helia" target="_blank">Helia</a> (IPFS implementation in JS) and the <a href="https://github.com/ipfs/helia-verified-fetch" target="_blank">@helia/verified-fetch</a> library (<a href="https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API" target="_blank">Fetch API</a> for IPFS) to facilitate direct verified retrieval of <a href="https://docs.ipfs.tech/concepts/content-addressing/" target="_blank">content-addressed</a> data.</p>
          <p><strong>Why?</strong> It improves decentralization, offers enhanced security (CID verification happens on end user's machine) and reliability (ability to do retrieval from multiple sources without reliance on a single HTTP server).</p>
          <p><strong>How does it work?</strong> A Service Worker is registered on the initial page load, and then intercepts HTTP requests for content stored on <a href="https://docs.ipfs.tech/how-to/address-ipfs-on-web/" target="_blank">IPFS paths</a> such as <code>/ipfs/*</code> (immutable) and <code>/ipns/*</code> (mutable), takes care of IPFS retrieval, verification, UnixFS deserialization, and returns Response objects to the browser.</p>
          <p><strong>Is this production ready?</strong> This project is under heavy development and is not yet fully compliant with <a href="https://specs.ipfs.tech/http-gateways/" target="_blank">IPFS Gateway Specfications</a>. Track our efforts  <a href="https://github.com/ipfs/service-worker-gateway/milestones" target="_blank">here</a>.</p>
          <p><strong>Found a bug?</strong> We welcome you to report it by <a href="https://github.com/ipfs/service-worker-gateway/issues/new" target="_blank">opening an issue</a> with details like an address and a screenshot.</p>
        </aside>
  )
}
