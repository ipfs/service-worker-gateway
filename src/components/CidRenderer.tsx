/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import React, { useEffect } from 'react'

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

export default function CidRenderer ({ cid }: { cid: string }): JSX.Element {
  // const [isVideo, setIsVideo] = React.useState(false)
  // const [isImage, setIsImage] = React.useState(false)
  const [contentType, setContentType] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [abortController, setAbortController] = React.useState<AbortController | null>(null)
  const [blob, setBlob] = React.useState<Blob | null>(null)
  const [text, setText] = React.useState('')

  useEffect(() => {
    if (cid === null || cid === '' || isLoading) {
      return
    }
    try {
      CID.parse(cid)
    } catch {
      return
    }
    // cancel previous fetchRequest when cid is changed
    abortController?.abort()
    // set loading to bloack this useEffect from running until done.
    setIsLoading(true)
    const newAbortController = new AbortController()
    setAbortController(newAbortController)
    // console.log('fetching from CidRenderer')
    const fetchContent = async (): Promise<void> => {
      const res = await fetch(`ipfs/${cid}`, {
        signal: newAbortController.signal,
        method: 'GET',
        headers: {
          // cache: 'no-cache', // uncomment when testing
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
        }
      })
      const contentType = res.headers.get('content-type')
      // console.log('res.headers: ', res.headers)
      // console.log('contentType: ', contentType)
      setContentType(contentType)
      console.log('contentType: ', contentType)
      // if ((contentType?.startsWith('video/')) === true) {
      //   // setIsVideo(true)
      // } else if ((contentType?.startsWith('image/')) === true) {
      //   // setIsImage(true)
      // }
      setBlob(await res.clone().blob())
      setText(await res.text())
      setIsLoading(false)
    }

    void fetchContent()
  }, [cid])

  // console.log('cid: ', cid)
  if (cid == null || cid === '') {
    return <span>Nothing to render yet. Enter a CID</span> // bafkreiezuss4xkt5gu256vjccx7vocoksxk77vwmdrpwoumfbbxcy2zowq
  }
  try {
    CID.parse(cid)
  } catch {
    return <span>Invalid CID</span>
  }

  if (isLoading) {
    return <span>Loading...</span>
  }

  if (contentType?.startsWith('video/') && blob != null) {
    return (
      <video controls autoPlay loop className="center" width="100%">
        <source src={URL.createObjectURL(blob)} type={contentType} />
      </video>
    )
  }
  if (contentType?.startsWith('image/') && blob != null) {
    return <img src={URL.createObjectURL(blob)} />
  }
  if (contentType?.startsWith('text/') && blob != null) {
    return <pre>{text}</pre>
  }
  return <span>Not a supported content-type of <pre>{contentType}</pre></span>
  // return (
  //   <video controls autoPlay loop className="center">
  //     <source src={`/ipfs/${cid}`} type="video/mp4" />
  //   </video>
  // )
}
