import { CID } from 'multiformats/cid'
import React, { useState } from 'react'
import { parseRequest } from '../../lib/parse-request.ts'
import { Link } from './link.tsx'
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
            <td>HTTP Subdomain Gateway URL</td>
            <td><pre className='di pl3'>https://cid.ipfs.dweb.link/..</pre></td>
          </tr>
          <tr>
            <td>HTTP Path Gateway URL</td>
            <td><pre className='di pl3'>https://dweb.link/ipfs/cid/..</pre></td>
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
  errorElement?: ReactElement
}

const ValidationMessage: React.FC<ValidationMessageProps> = ({ errorElement }) => {
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
  input: string
  setInput(download: string): void
  setSubdomainURL(val: URL): void
  setInvalid(invalid: boolean): void
}

export function CIDInput ({ input, setInput, setSubdomainURL, setInvalid }: CIDInputProps): ReactElement {
  let initialErrorElement: ReactElement | undefined

  const [errorElement, setErrorElement] = useState(initialErrorElement)

  function validate (val: string): void {
    setInput(val)

    // it may be just a CID
    try {
      CID.parse(val)

      val = `/ipfs/${val}`
    } catch {
      // ignore
    }

    try {
      const request = parseRequest(val, new URL(globalThis.location.href))

      if (request.type === 'subdomain' || request.type === 'path' || request.type === 'native') {
        if (request.protocol === 'ipfs') {
          setSubdomainURL(request.subdomainURL)
          setInvalid(false)
          return
        } else if (request.protocol === 'ipns') {
          setSubdomainURL(request.subdomainURL)
          setInvalid(false)
          return
        } else if (request.protocol === 'dnslink') {
          setSubdomainURL(request.subdomainURL)
          setInvalid(false)
          return
        }
      }
    } catch (err) {
      setErrorElement(<FormatHelp />)
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
        value={input}
        onChange={(e) => validate(e.target.value)}
      />
      <ValidationMessage
        errorElement={errorElement}
      />
    </>
  )
}
