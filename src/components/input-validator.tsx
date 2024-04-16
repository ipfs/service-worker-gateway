import { CID } from 'multiformats/cid'
import React from 'react'
import { pathRegex, subdomainRegex, type IpfsUriParts } from '../lib/regex.js'

function FormatHelp (): JSX.Element {
  return (
    <p>
      <span>Not a valid IPFS or IPNS path. Use one of the following formats:</span>
      <ul>
        <li><pre className="di">/ipfs/cid/path</pre></li>
        <li><pre className="di">/ipns/peerId/path</pre></li>
        <li><pre className="di">/ipns/dnsLink/path</pre></li>
        <li><pre className="di">https?://example.com/ipfs/cid/path</pre></li>
        <li><pre className="di">https?://example.com/ipns/peerId/path</pre></li>
        <li><pre className="di">https?://example.com/ipns/dnsLink/path</pre></li>
        <li><pre className="di">https?://cid.ipfs.example.com/path</pre></li>
        <li><pre className="di">https?://peerId.ipns.example.com/path</pre></li>
        <li><pre className="di">https?://encodedDnsLink.ipns.example.com/path</pre></li>
        <li><pre className="di">cid.ipfs.example.com/path</pre></li>
        <li><pre className="di">peerId.ipns.example.com/path</pre></li>
        <li><pre className="di">encodedDnsLink.ipns.example.com/path</pre></li>
      </ul>
      <span>Note that <pre className="di">/path</pre> is optional.</span>
    </p>
  )
}

function ValidationMessage ({ cidOrPeerIdOrDnslink, requestPath, protocol, children }): JSX.Element {
  let errorElement: JSX.Element | null = null
  if (requestPath == null || requestPath === '') {
    errorElement = <span>Enter a valid IPFS/IPNS path.</span>
  } else if (protocol !== 'ipfs' && protocol !== 'ipns') {
    errorElement = <FormatHelp />
  } else if (cidOrPeerIdOrDnslink == null || cidOrPeerIdOrDnslink === '') {
    const contentType = protocol === 'ipfs' ? 'CID' : 'PeerId or DnsLink'
    errorElement = <span>Content identifier missing. Add a {contentType} to your path</span>
  } else if (protocol === 'ipfs') {
    try {
      CID.parse(cidOrPeerIdOrDnslink)
    } catch {
      errorElement = <span>Invalid CID</span>
    }
  }

  if (errorElement == null) {
    return <>{ children }</>
  }

  return <>
    <span className="pb3 pa3 db bg-light-yellow">
      { errorElement }
    </span>
  </>
}

const parseInput = (uri: string): Partial<IpfsUriParts> => {
  const uriMatch = uri.match(pathRegex) ?? uri.match(subdomainRegex)
  if (uriMatch?.groups != null) {
    const { protocol, cidOrPeerIdOrDnslink, path } = uriMatch.groups as unknown as IpfsUriParts
    return { protocol, cidOrPeerIdOrDnslink, path: path?.trim() ?? undefined }
  }

  return {}
}

export default function InputValidator ({ requestPath }: { requestPath: string }): JSX.Element {
  const { protocol, cidOrPeerIdOrDnslink, path } = parseInput(requestPath)
  const swPath = `/${protocol}/${cidOrPeerIdOrDnslink}${path ?? ''}`

  return (
    <div>
      <ValidationMessage protocol={protocol} cidOrPeerIdOrDnslink={cidOrPeerIdOrDnslink} requestPath={requestPath}>
        <a className="db" href={swPath} target="_blank">
          <button id="load-directly" className='button-reset pv3 tc bn bg-animate bg-black-80 hover-bg-aqua white pointer w-100'>Load content</button>
        </a>
      </ValidationMessage>
    </div>
  )
}
