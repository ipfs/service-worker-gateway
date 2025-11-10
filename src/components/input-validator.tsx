import { CID } from 'multiformats/cid'
import React from 'react'
import { nativeProtocolRegex, pathRegex, subdomainRegex } from '../lib/regex.js'
import { getGatewayRoot } from '../lib/to-gateway-root.js'
import { Link } from './link.jsx'
import type { IpfsUriParts } from '../lib/regex.js'
import type { ReactElement } from 'react'

function FormatHelp (): ReactElement {
  return (
    <>
      <p>Invalid address, please correct it and try again. For reference, accepted formats are:</p>
      <table>
        <tbody>
          <tr>
            <td>IPFS Path</td>
            <td><pre className='di pl3'>/ipfs/cid/..</pre></td>
          </tr>
          <tr>
            <td>HTTP Gateway URL</td>
            <td><pre className='di pl3'>https://cid.ipfs.dweb.link/..</pre></td>
          </tr>
          <tr>
            <td>Native IPFS URL</td>
            <td><pre className='di pl3'>ipfs://cid/..</pre></td>
          </tr>
        </tbody>
      </table>
      <p>Learn more at <Link href='https://docs.ipfs.tech/how-to/address-ipfs-on-web'>Addressing IPFS on the Web</Link></p>
    </>
  )
}
interface ValidationMessageProps {
  cidOrPeerIdOrDnslink?: IpfsUriParts['cidOrPeerIdOrDnslink'],
  requestPath: string,
  protocol?: IpfsUriParts['protocol'],
  children: React.ReactNode
}

const ValidationMessage: React.FC<ValidationMessageProps> = ({ cidOrPeerIdOrDnslink, requestPath, protocol, children }) => {
  let errorElement: ReactElement | null = null

  if (requestPath == null || requestPath === '') {
    errorElement = null
  } else if (protocol !== 'ipfs' && protocol !== 'ipns') {
    errorElement = <FormatHelp />
  } else if (cidOrPeerIdOrDnslink == null || cidOrPeerIdOrDnslink === '') {
    const contentType = protocol === 'ipfs' ? 'CID' : 'PeerID or DNSLink'
    errorElement = <span>Content identifier missing. Add a {contentType} to your path</span>
  } else if (protocol === 'ipfs') {
    try {
      CID.parse(cidOrPeerIdOrDnslink)
    } catch (err: any) {
      errorElement = (
        <>
          <p>Invalid CID</p>
          <p>The CID failed to parse with the error "{err.message}"</p>
        </>
      )
    }
  }

  if (errorElement == null) {
    return (
      <>
        {children}
      </>
    )
  }

  return (
    <>
      <span className='pb3 pa3 db bg-light-yellow'>
        {errorElement}
      </span>
    </>
  )
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

export default function InputValidator ({ requestPath }: { requestPath: string }): ReactElement {
  const { protocol, cidOrPeerIdOrDnslink, path } = parseInput(requestPath)
  const swPath = `/${protocol}/${cidOrPeerIdOrDnslink}${path ?? ''}`

  function checkInput (): boolean | undefined {
    if (protocol == null || cidOrPeerIdOrDnslink == null) {
      return false
    }

    window.location.href = getGatewayRoot() + swPath
  }

  return (
    <div>
      <ValidationMessage protocol={protocol} cidOrPeerIdOrDnslink={cidOrPeerIdOrDnslink} requestPath={requestPath}>
        <button id='load-directly' className='button-reset pv3 tc bn bg-animate bg-teal-muted hover-bg-navy-muted white pointer f4 w-100' onClick={checkInput}>Load content</button>
      </ValidationMessage>
    </div>
  )
}
