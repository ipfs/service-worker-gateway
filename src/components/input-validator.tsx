import { CID } from 'multiformats/cid'
import React from 'preact/compat'
import { nativeProtocolRegex, pathRegex, subdomainRegex, type IpfsUriParts } from '../lib/regex.js'

function FormatHelp (): React.JSX.Element {
  return (
    <p>
      <p>Not a valid IPFS or IPNS path. Use one of the following formats:</p>
      <table>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>Type</th>
            <th style={{ textAlign: 'left' }}>Example</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Native protocol</td>
            <td><pre className="di">ip[fn]s://contentId</pre></td>
          </tr>
          <tr>
            <td>Path only</td>
            <td><pre className="di">/ip[fn]s/contentId</pre></td>
          </tr>
          <tr>
            <td>Url (or schemeless)</td>
            <td><pre className="di">https?://example.com/ip[fn]s/contentId</pre></td>
          </tr>
          <tr>
            <td>Subdomain host</td>
            <td><pre className="di">contentId.ip[fn]s.example.com</pre></td>
          </tr>
        </tbody>
      </table>
      <p>Note that a <pre className="di">contentId</pre> is any of: CID, PeerId, DnsLink.</p>
      <p>Note that a <pre className="di">/path</pre> can be postfixed to any url.</p>
    </p>
  )
}

function ValidationMessage ({ cidOrPeerIdOrDnslink, requestPath, protocol, children }): React.JSX.Element {
  let errorElement: React.JSX.Element | null = null
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
  const uriMatch = uri.match(pathRegex) ?? uri.match(subdomainRegex) ?? uri.match(nativeProtocolRegex)
  if (uriMatch?.groups != null) {
    const { protocol, cidOrPeerIdOrDnslink, path } = uriMatch.groups as unknown as IpfsUriParts
    return { protocol, cidOrPeerIdOrDnslink, path: path?.trim() ?? undefined }
  }

  return {}
}

export default function InputValidator ({ requestPath }: { requestPath: string }): React.JSX.Element {
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
