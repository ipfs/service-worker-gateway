/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import React, { useCallback, useEffect } from 'react'

import { CID } from 'multiformats/cid'
// import Video from './Video'

/**
 * Test files:
 * bafkreienxxjqg3jomg5b75k7547dgf7qlbd3qpxy2kbg537ck3rol4mcve  - text            - https://bafkreienxxjqg3jomg5b75k7547dgf7qlbd3qpxy2kbg537ck3rol4mcve.ipfs.w3s.link/?filename=test.txt
 * bafkreicafxt3zr4cshf7qteztjzl62ouxqrofu647e44wt7s2iaqjn7bra  - image/jpeg      - http://127.0.0.1:8080/ipfs/bafkreicafxt3zr4cshf7qteztjzl62ouxqrofu647e44wt7s2iaqjn7bra?filename=bafkreicafxt3zr4cshf7qteztjzl62ouxqrofu647e44wt7s2iaqjn7bra
 * bafkreif4ufrfpfcmqn5ltjvmeisgv4k7ykqz2mjygpngtwt4bijxosidqa  - image/svg+xml   - https://bafkreif4ufrfpfcmqn5ltjvmeisgv4k7ykqz2mjygpngtwt4bijxosidqa.ipfs.dweb.link/?filename=Web3.Storage-logo.svg
 * bafybeiekildl23opzqcsufewlbadhbabs6pyqg35tzpfavgtjyhchyikxa  - video/quicktime - https://bafybeiekildl23opzqcsufewlbadhbabs6pyqg35tzpfavgtjyhchyikxa.ipfs.dweb.link
 * bafkreiezuss4xkt5gu256vjccx7vocoksxk77vwmdrpwoumfbbxcy2zowq  - video/webm (147.78 KiB)    - https://bafkreiezuss4xkt5gu256vjccx7vocoksxk77vwmdrpwoumfbbxcy2zowq.ipfs.dweb.link
 * bafybeierkpfmf4vhtdiujgahfptiyriykoetxf3rmd3vcxsdemincpjoyu  - video/mp4 (2.80 MiB)    - https://bafybeierkpfmf4vhtdiujgahfptiyriykoetxf3rmd3vcxsdemincpjoyu.ipfs.dweb.link
 * QmbGtJg23skhvFmu9mJiePVByhfzu5rwo74MEkVDYAmF5T - video (160MiB)
 */

/**
 *
 * Test CIDs
 * QmbGtJg23skhvFmu9mJiePVByhfzu5rwo74MEkVDYAmF5T
 *
 */

function contentRender ({ blob, contentType, text, cid, path, isLoading }): JSX.Element {
  let content: JSX.Element | null = null
  if (isLoading) {
    content = <span>Loading...</span>
  } else if (contentType?.startsWith('video/') && blob != null) {
    content = (
      <video controls autoPlay loop className="center" width="100%">
        <source src={URL.createObjectURL(blob)} type={contentType} />
      </video>
    )
  } else if (contentType?.startsWith('image/') && blob != null) {
    content = <img src={URL.createObjectURL(blob)} />
  } else if (contentType?.startsWith('text/html') && blob != null) {
    const iframeSrc = `/helia-sw/${cid}${path ? `${path}` : ''}`
    // return the HTML in an iframe
    content = <iframe src={iframeSrc} width="100%" height="100%"/>
  } else if (contentType?.startsWith('text/') && blob != null) {
    content = <pre>{text}</pre>
  } else {
    content = <span>Not a supported content-type of <pre>{contentType}</pre></span>
  }

  return (
    <div className="pt3 db" style={{ height: '50vh' }}>
      {content}
    </div>
  )
}

function ValidationMessage ({ cid, cidAndPath, ipfsPrefix, children }): JSX.Element {
  let errorElement: JSX.Element | null = null
  if (cidAndPath == null || cidAndPath === '') {
    errorElement = <span>Nothing to render yet. Enter an IPFS Path</span> // bafkreiezuss4xkt5gu256vjccx7vocoksxk77vwmdrpwoumfbbxcy2zowq
  } else if (ipfsPrefix !== 'ipfs') {
    errorElement = <span>Not a valid IPFS path. Use the format <pre className="di">/ipfs/cid/path</pre>, where /path is optional</span>
  } else if (cid == null || cid === '') {
    errorElement = <span>Nothing to render yet. Add a CID to your path</span> // bafkreiezuss4xkt5gu256vjccx7vocoksxk77vwmdrpwoumfbbxcy2zowq
  } else {
    try {
      CID.parse(cid)
    } catch {
      errorElement = <span>Invalid CID</span>
    }
  }

  if (errorElement == null) {
    return <>{ children }</>
  }

  return <>
    <span className="pb3 db">
      { errorElement }
    </span>
  </>
}

// contentRender({ blob, contentType, text, cid, path: cidPath })
export default function CidRenderer ({ cidAndPath }: { cidAndPath: string }): JSX.Element {
  // const [isVideo, setIsVideo] = React.useState(false)
  // const [isImage, setIsImage] = React.useState(false)
  const [contentType, setContentType] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [abortController, setAbortController] = React.useState<AbortController | null>(null)
  const [blob, setBlob] = React.useState<Blob | null>(null)
  const [text, setText] = React.useState('')
  const [lastFetchPath, setLastFetchPath] = React.useState<string | null>(null)
  // timer id to delay the fetch request so we don't fetch on every key stroke
  /**
   * cidAndPath may be any of the following formats:
   *
   * * `/ipfs/${cid}/${path}`
   * * `/ipfs/${cid}`
   */
  const ipfsPrefix = cidAndPath.split('/')[1]
  const cid = cidAndPath.split('/')[2]
  const cidPath = cidAndPath.split('/')[3] ? `/${cidAndPath.split('/').slice(3).join('/')}` : ''
  const swPath = `/helia-sw/${cid ?? ''}${cidPath ?? ''}`

  const makeRequest = async (): Promise<void> => {
    // if (cid === null || cid === '' || isLoading) {
    //   return
    // }
    // try {
    //   CID.parse(cid)
    // } catch {
    //   return
    // }
    // cancel previous fetchRequest when cid is changed
    abortController?.abort()
    const newAbortController = new AbortController()
    setAbortController(newAbortController)
    console.log(`fetching 'ipfs/${cid}${cidPath}' from service worker`)
    // const fetchContent = async (): Promise<void> => {
    setLastFetchPath(swPath)
    setIsLoading(true)
    const res = await fetch(swPath, {
      signal: newAbortController.signal,
      method: 'GET',
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
      }
    })
    const contentType = res.headers.get('content-type')

    setContentType(contentType)
    setBlob(await res.clone().blob())
    setText(await res.text())
    setIsLoading(false)
    // }

    // use timeout to delay the fetch request so we don't fetch on every key stroke
    // i.e. simple debounce
    // setSubmitDelay(window.setTimeout(() => {
    // set loading to bloack this useEffect from running until done.
    // setIsLoading(true)
    // void fetchContent()
    // }, 500))
    // void fetchContent()
  }

  // if (isLoading) {
  //   return <span>Loading...</span>
  // }
  let inPageContent: JSX.Element | null = null
  if (lastFetchPath === swPath) {
    if (isLoading) {
      inPageContent = <span>Loading...</span>
    } else {
      inPageContent = contentRender({ blob, contentType, text, cid, path: cidPath, isLoading })
    }
  }

  return (
    <div>
      <ValidationMessage ipfsPrefix={ipfsPrefix} cid={cid} cidAndPath={cidAndPath}>
        <button onClick={() => { void makeRequest() }} className='button-reset pv3 tc bn bg-animate bg-black-80 hover-bg-aqua white pointer w-100'>Load in-page</button>

        <a className="pt3 db" href={swPath} target="_blank">
          <button className='button-reset pv3 tc bn bg-animate bg-black-80 hover-bg-aqua white pointer w-100'>Load directly / download</button>
        </a>

        {inPageContent}
      </ValidationMessage>
    </div>
  )
}
