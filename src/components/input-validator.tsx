import { CID } from 'multiformats/cid'
import React from 'preact/compat'
import { nativeProtocolRegex, pathRegex, subdomainRegex, type IpfsUriParts } from '../lib/regex.js'

function FormatHelp (): React.JSX.Element {
  return (
    <>
      <p>Invalid address, correct it and try again. For reference, accepted formats are:</p>
      <table>
        <tbody>
          <tr>
            <td>UNIX-like Content Path</td>
            <td><pre className="di">/ipfs/cid/..</pre></td>
          </tr>
          <tr>
            <td>HTTP Gateway URL</td>
            <td><pre className="di">https://ipfs.io/ipfs/cid..</pre></td>
          </tr>
          <tr>
            <td>Native IPFS URL</td>
            <td><pre className="di">ipfs://cid/..</pre></td>
          </tr>
        </tbody>
      </table>
      <p>Learn more at <a target="_blank" href="https://docs.ipfs.tech/how-to/address-ipfs-on-web">Addressing IPFS on the Web</a></p>
    </>
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

  // it may be just a CID
  try {
    CID.parse(uri)
    return { protocol: 'ipfs', cidOrPeerIdOrDnslink: uri }
  } catch (_) {
    // ignore.
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
