import prettyBytes from 'pretty-bytes'
import React from 'react'
import { FaDownload } from 'react-icons/fa'
import { toGatewayRoot } from '../../lib/to-gateway-root.ts'
import type { ReactElement } from 'react'

declare global {
  var renderMedia: {
    cid: string
    ipfsPath: string
    contentType: string
    contentLength: number | null
    kind: 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'json'
    displayName: string
    filename: string
    url: string
  } | undefined
}

const TOP_BAR_HEIGHT_PX = 40

const topBarStyle: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  height: TOP_BAR_HEIGHT_PX,
  zIndex: 10
}

const bodyStyle: React.CSSProperties = {
  // viewport minus the sticky bar; lets `<video>`/`<iframe>`/... fill the
  // remaining space without overflowing
  height: `calc(100vh - ${TOP_BAR_HEIGHT_PX}px)`,
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'auto',
  background: '#000'
}

const mediaStyle: React.CSSProperties = {
  maxWidth: '100%',
  maxHeight: '100%',
  display: 'block'
}

const iframeStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  border: 'none',
  background: '#fff'
}

export function RenderMediaPage (): ReactElement {
  const props = globalThis.renderMedia

  if (props == null) {
    // No SW props — the user landed here directly (e.g. typed the gateway
    // root in the URL bar). Send them to the home UI.
    globalThis.location.href = toGatewayRoot('/')
    return <></>
  }

  const downloadHref = `?download=true&filename=${encodeURIComponent(props.filename)}`
  const sizeLabel = props.contentLength != null ? prettyBytes(props.contentLength) : null

  return (
    <>
      <header className='flex items-center bg-navy white ph3 sans-serif f6' style={topBarStyle}>
        <a href={toGatewayRoot('/')} className='white no-underline b' title='IPFS Service Worker Gateway'>ipfs</a>
        <span className='mh2 white-50'>{'\u25b8'}</span>
        <span className='truncate b' title={props.displayName}>{props.displayName}</span>
        <span className='mh2 white-50'>{'\u25b8'}</span>
        <span className='white-70 truncate'>{props.contentType}</span>
        {sizeLabel != null && (
          <>
            <span className='mh2 white-50'>{'\u2022'}</span>
            <span className='white-70'>{sizeLabel}</span>
          </>
        )}
        <span className='flex-auto' />
        {/*
          No `download` HTML attribute on purpose. Chromium bypasses the
          Service Worker for `<a download>` clicks
          (https://issues.chromium.org/issues/40410035), so our
          `?download=true` handler would never run and the browser would
          save the dev server's bootstrap HTML instead. A plain navigation
          goes through the SW; verified-fetch + the SW set
          `Content-Disposition: attachment; filename="..."` from
          `?filename=`, which all browsers honor.
        */}
        <a
          href={downloadHref}
          className='inline-flex items-center bg-aqua navy no-underline ph3 pv1 br2 b'
          title={`Download ${props.filename}`}
        >
          <FaDownload className='mr2' />
          Download
        </a>
      </header>
      <main style={bodyStyle}>
        <MediaBody {...props} />
      </main>
    </>
  )
}

function MediaBody ({ kind, url, filename, contentType }: NonNullable<typeof globalThis.renderMedia>): ReactElement {
  switch (kind) {
    case 'image':
      return <img src={url} alt={filename} style={mediaStyle} />
    case 'video':
      return <video src={url} controls style={mediaStyle} />
    case 'audio':
      return <audio src={url} controls style={{ width: '80%' }} />
    case 'pdf':
      // `#toolbar=0` hides the embedded PDF.js toolbar in Chromium, nudging
      // users toward our explicit Download button.
      return <iframe src={`${url}#toolbar=0`} title={filename} style={iframeStyle} />
    case 'text':
    case 'json':
      // Reuse the browser's built-in text/JSON renderer via an iframe. The
      // subresource fetch arrives with `destination === 'iframe'`, skipping
      // the wrapper. Cheap, and avoids fetching the body in JS just to drop
      // it into a `<pre>`.
      return <iframe src={url} title={filename} style={iframeStyle} />
    default:
      return <div className='white pa4'>Unsupported media type: {contentType}</div>
  }
}
