import { MEDIA_TYPE_CBOR, MEDIA_TYPE_DAG_CBOR, MEDIA_TYPE_DAG_JSON, MEDIA_TYPE_JSON, MEDIA_TYPE_RAW, MEDIA_TYPE_DAG_PB } from '@helia/verified-fetch'
import * as dagCbor from '@ipld/dag-cbor'
import * as dagJson from '@ipld/dag-json'
import * as dagPb from '@ipld/dag-pb'
import { CID } from 'multiformats/cid'
import * as json from 'multiformats/codecs/json'
import * as raw from 'multiformats/codecs/raw'
import prettyBytes from 'pretty-bytes'
import React from 'react'
import { FaRegFile } from 'react-icons/fa'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { removeRootHashIfPresent } from '../../lib/remove-root-hash.ts'
import { getGatewayRoot, toGatewayRoot } from '../../lib/to-gateway-root.ts'
import { CIDDetails } from '../components/cid-details.tsx'
import ContentBox from '../components/content-box.tsx'
import { HexViewer } from '../components/hex-viewer.tsx'
import { Link } from '../components/link.tsx'
import './render-entity.css'
import { createLink } from '../utils/links.ts'
import type { ReactElement } from 'react'

declare global {
  var renderEntity: {
    cid: string
    ipfsPath: string,
    entity: string,
    contentType?: string
  }
}

export interface RenderEntityPageProps {
  cid?: string
  ipfsPath?: string
  entity?: string
  contentType?: string
}

interface Decoder {
  name: string
  decode(buf: Uint8Array): any
  render(obj: any, ipfsPath: string): ReactElement
}

const objectDecoders: Record<string, Decoder> = {
  [MEDIA_TYPE_DAG_CBOR]: {
    name: 'dag-cbor',
    decode: dagCbor.decode,
    render: (obj, ipfsPath) => renderEntity('dag-cbor', obj, ipfsPath)
  },
  [MEDIA_TYPE_CBOR]: {
    name: 'cbor',
    decode: dagCbor.decode,
    render: (obj, ipfsPath) => renderEntity('cbor', obj, ipfsPath)
  },
  [MEDIA_TYPE_DAG_JSON]: {
    name: 'dag-json',
    decode: dagJson.decode,
    render: (obj, ipfsPath) => renderEntity('dag-json', obj, ipfsPath)
  },
  [MEDIA_TYPE_JSON]: {
    name: 'json',
    decode: json.decode,
    render: (obj, ipfsPath) => renderEntity('json', obj, ipfsPath)
  },
  [MEDIA_TYPE_RAW]: {
    name: 'raw',
    decode: raw.decode,
    render: (obj, ipfsPath) => renderEntity('raw', obj, ipfsPath)
  },
  [MEDIA_TYPE_DAG_PB]: {
    name: 'dag-pb',
    decode: dagPb.decode,
    render: (obj, ipfsPath) => renderEntity('dag-pb', obj, ipfsPath)
  }
}

export function RenderEntityPage ({ cid, ipfsPath, entity, contentType }: RenderEntityPageProps): ReactElement {
  cid = cid ?? globalThis.renderEntity?.cid
  ipfsPath = ipfsPath ?? globalThis.renderEntity?.ipfsPath
  entity = entity ?? globalThis.renderEntity?.entity
  contentType = contentType ?? globalThis.renderEntity?.contentType

  if (cid == null || entity == null || contentType == null) {
    globalThis.location.href = toGatewayRoot('/')

    return (
      <></>
    )
  }

  removeRootHashIfPresent()

  const cidObj = CID.parse(cid)
  const buf = uint8ArrayFromString(entity, 'base64')

  if (contentType === MEDIA_TYPE_DAG_PB) {
    return (
      <UnixFSDirectory cid={cidObj} ipfsPath={ipfsPath} directory={dagPb.decode(buf)} />
    )
  }

  const decoder = objectDecoders[contentType] ?? objectDecoders[MEDIA_TYPE_RAW]
  const obj = decoder.decode(buf)
  const renderer = decoder.render(obj, ipfsPath)

  const title = (
    <>
      <div><UnixFSPath ipfsPath={ipfsPath} /></div>
      <code className='black-40 db mt2'>{cid.toString()}</code>
      <CIDDetails ipfsPath={ipfsPath} cid={cidObj} className='mt0 black-40' buttonClassName='black-40' />
    </>
  )

  const conversion = (
    <>
      <p className='lh-copy ma2 mt3 ml3 pa0'>You can download this block as:</p>
      <ul className='lh-copy ma2 ml5 mb3 pa0'>
        <li><a href={createLink({ params: { format: 'raw', download: 'true' } })} className='link'>Raw Block</a> (no conversion)</li>
        <li><a href={createLink({ params: { format: 'dag-json', download: 'true' } })} className='link'>DAG-JSON</a> (specs at <Link href='https://ipld.io/specs/codecs/dag-json/spec/'>IPLD</Link> and <Link href='https://www.iana.org/assignments/media-types/application/vnd.ipld.dag-json'>IANA</Link>)</li>
        <li><a href={createLink({ params: { format: 'dag-cbor', download: 'true' } })} className='link'>DAG-CBOR</a> (specs at <Link href='https://ipld.io/specs/codecs/dag-cbor/spec/'>IPLD</Link> and <Link href='https://www.iana.org/assignments/media-types/application/vnd.ipld.dag-cbor'>IANA</Link>)</li>
      </ul>
    </>
  )

  return (
    <>
      <ContentBox title={title}>
        <>
          {conversion}
          {renderer}
        </>
      </ContentBox>
    </>
  )
}

interface UnixFSPathProps {
  ipfsPath: string
}

function UnixFSPath ({ ipfsPath }: UnixFSPathProps): ReactElement {
  // /ipfs/cid/path
  const parts = ipfsPath.split('/')
    .slice(2)
    .filter(segment => segment !== '')
    .map((segment, index, arr) => {
      return (
        <span key={`index-${index}`}>/<a href={`/${arr.slice(1, index + 1).join('/')}`} className={`link ${index === 0 ? 'ipfs-hash' : ''}`}>{segment}</a></span>
      )
    })

  return (
    <>
      /ipfs{parts}
    </>
  )
}

interface UnixFSDirectoryProps {
  cid: CID
  ipfsPath: string
  directory: dagPb.PBNode
}

function UnixFSDirectory ({ cid, ipfsPath, directory }: UnixFSDirectoryProps): ReactElement {
  const title = (
    <>
      <div>Index of <UnixFSPath ipfsPath={ipfsPath} /></div>
      <code className='black-40 db mt2'>{cid.toString()}</code>
      <CIDDetails ipfsPath={ipfsPath} cid={cid} className='mt0 black-40' buttonClassName='black-40' />
    </>
  )

  const navigation = (
    <>
      <div>{prettyBytes(directory.Links.reduce((acc, curr) => acc + (curr.Tsize ?? 0), 0))}</div>
    </>
  )

  function viewLink (name: string): void {
    const url = new URL(window.location.href)

    window.location.href = `${url.protocol}//${url.host}${url.pathname}${encodeURI(name)}${url.search}${url.hash}`
  }

  const linkParts = ipfsPath.split('/')
  let uplink = <></>

  if (linkParts.length > 3) {
    while (linkParts[linkParts.length - 1] === '') {
      linkParts.pop()
    }

    linkParts.pop()

    function upLink (): void {
      const url = new URL(window.location.href)

      window.location.href = `${url.protocol}//${url.host}${encodeURI(`${linkParts.join('/')}`)}${url.search}${url.hash}`
    }

    uplink = (
      <tr
        className='striped--entity-props striped--entity-props-hover'
        onClick={() => upLink()}
      >
        <td className='ph3 tl pointer icon-cell' style={{ width: 50, paddingTop: 24, paddingBottom: 24 }} onClick={() => upLink()}><FaRegFile /></td>
        <td className='pv2 ph3 tl pointer truncate name-cell' onClick={() => upLink()} colSpan={3}>..</td>
      </tr>
    )
  }

  return (
    <>
      <ContentBox title={title} navigation={navigation}>
        <table className='collapse w-100 unixfs-directory'>
          {uplink}
          {
            [...Object.entries(directory.Links)].map(([key, value], index) => {
              return (
                <UnixFSDirectoryRow key={`prop-${index}`} ipfsPath={ipfsPath} value={value} viewLink={viewLink} />
              )
            })
          }
        </table>
      </ContentBox>
    </>
  )
}

interface UnixFSDirectoryRowProps {
  viewLink(name?: string): void
  ipfsPath: string
  value: dagPb.PBLink
}

function UnixFSDirectoryRow ({ viewLink, ipfsPath, value }: UnixFSDirectoryRowProps): ReactElement {
  return (
    <>
      <tr
        className='striped--entity-props striped--entity-props-hover'
        onClick={() => viewLink(value.Name)}
      >
        <td className='pv2 ph3 tl pointer icon-cell' style={{ width: 50 }} onClick={() => viewLink(value.Name)}><FaRegFile /></td>
        <td className='pv2 ph3 tl pointer truncate name-cell' onClick={() => viewLink(value.Name)}>{value.Name?.toString()}</td>
        <td className='pv2 ph3 tl pointer truncate w-30 hash-cell' onClick={() => viewLink(value.Name)}>
          <code>{value.Hash.toString()}</code>
          <CIDDetails ipfsPath={`${ipfsPath}/${value.Name}`} cid={value.Hash} className='black-40 mt1' buttonClassName='black-40' />
        </td>
        <td className='pv2 ph3 tl w-10 pointer truncate size-cell' onClick={() => viewLink(value.Name)}>{prettyBytes(value.Tsize ?? 0)}</td>
      </tr>
    </>
  )
}

function renderEntity (codec: string, obj: any, ipfsPath: string): ReactElement {
  return (
    <>
      <header className='pt2 pb2 pl3 pr3 bg-snow bb bt b--gray-muted mb0'>
        <strong>{codec.toUpperCase()} Preview</strong>
      </header>
      {
        renderValue(codec, '', obj, ipfsPath)
      }
    </>
  )
}

function renderObject (codec: string, obj: any, ipfsPath: string, parent?: any): ReactElement {
  return (
    <>
      <table className='collapse w-100'>
        {
          [...Object.entries(obj)].map(([key, value], index) => {
            return (
              <tr key={`prop-${index}`} className='striped--entity-props'>
                <td className='pv2 ph3 w-10 tl'><code>{key}</code></td>
                <td className='pv2 ph3 tl'>{renderValue(codec, key, value, ipfsPath, obj)}</td>
              </tr>
            )
          })
        }
      </table>
    </>
  )
}

function renderValue (codec: string, key: string, value: any, ipfsPath: string, parent?: any): ReactElement {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <>
          <p className='black-40'>(Empty array)</p>
        </>
      )
    }
  }

  if (typeof value === 'string' || !isNaN(Number(value))) {
    return (
      <code>{`${value}`}</code>
    )
  }

  const cid = CID.asCID(value)

  if (cid != null) {
    let path = `/ipfs/${cid}`
    let link = `${getGatewayRoot()}/ipfs/${cid}`

    if (codec === 'dag-pb') {
      // render link as IPFS path instead of raw block
      if (key === 'Hash' && parent?.Name != null) {
        path = `${ipfsPath}/${parent.Name}`
        link = `${getGatewayRoot()}${path}`
      }
    }

    return (
      <>
        <a href={link} className='link'>{value.toString()}</a>
        <CIDDetails ipfsPath={path} cid={cid} />
      </>
    )
  }

  if (value instanceof Uint8Array) {
    return renderBuffer(value, ipfsPath)
  }

  return renderObject(codec, value, ipfsPath, parent)
}

function renderBuffer (obj: Uint8Array, ipfsPath: string): ReactElement {
  return (
    <>
      <HexViewer bytes={obj} />
    </>
  )
}
