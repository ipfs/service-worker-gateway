import { CID } from 'multiformats/cid'
import React, { useState } from 'react'
import { nativeProtocolRegex, pathRegex, subdomainRegex } from '../../lib/regex.ts'
import { Link } from './link.tsx'
import type { IpfsUriParts } from '../../lib/regex.ts'
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
  cidOrPeerIdOrDnslink: string,
  requestPath: string,
  protocol: string
}

const ValidationMessage: React.FC<ValidationMessageProps> = ({ cidOrPeerIdOrDnslink, requestPath, protocol }) => {
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
      <></>
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

export interface CIDInputProps {
  requestPath: string
  setRequestPath(val: string): void
  setInvalid(invalid: boolean): void
}

export function CIDInput ({ requestPath, setRequestPath, setInvalid }: CIDInputProps): ReactElement {
  let initialProtocol = ''
  let initialCid = ''

  try {
    const uriMatch = requestPath.match(pathRegex) ?? requestPath.match(subdomainRegex) ?? requestPath.match(nativeProtocolRegex)
    const { protocol, cidOrPeerIdOrDnslink } = uriMatch?.groups as unknown as IpfsUriParts

    initialProtocol = protocol
    initialCid = cidOrPeerIdOrDnslink
  } catch {}

  const [protocol, setProtocol] = useState(initialProtocol)
  const [cidOrPeerIdOrDnslink, setCidOrPeerIdOrDnslink] = useState(initialCid)

  function validate (val: string): void {
    setRequestPath(val)

    const uriMatch = val.match(pathRegex) ?? val.match(subdomainRegex) ?? val.match(nativeProtocolRegex)
    if (uriMatch?.groups != null) {
      const { protocol, cidOrPeerIdOrDnslink } = uriMatch.groups as unknown as IpfsUriParts

      setProtocol(protocol)
      setCidOrPeerIdOrDnslink(cidOrPeerIdOrDnslink)
      setInvalid(false)
      return
    }

    // it may be just a CID
    try {
      CID.parse(val)

      setProtocol('ipfs')
      setCidOrPeerIdOrDnslink(val)
      setInvalid(false)
      return
    } catch {
      // ignore
    }

    setInvalid(true)
  }

  return (
    <>
      <label htmlFor='inputContent' className='f5 ma0 pb2 teal fw4 db'>CID, Content Path, or URL</label>
      <input
        className='input-reset bn black-80 bg-white pa3 w-100 mb3'
        id='inputContent'
        name='inputContent'
        type='text'
        placeholder='/ipfs/bafk.../path/to/file'
        required
        value={requestPath}
        onChange={(e) => validate(e.target.value)}
      />
      <ValidationMessage
        protocol={protocol}
        cidOrPeerIdOrDnslink={cidOrPeerIdOrDnslink}
        requestPath={requestPath}
      />
    </>
  )
}
