/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { CID } from 'multiformats/cid'
import React from 'preact/compat'

/**
 * Test files:
 * bafkreienxxjqg3jomg5b75k7547dgf7qlbd3qpxy2kbg537ck3rol4mcve  - text            - https://bafkreienxxjqg3jomg5b75k7547dgf7qlbd3qpxy2kbg537ck3rol4mcve.ipfs.w3s.link/?filename=test.txt
 * bafkreicafxt3zr4cshf7qteztjzl62ouxqrofu647e44wt7s2iaqjn7bra  - image/jpeg      - http://127.0.0.1:8080/ipfs/bafkreicafxt3zr4cshf7qteztjzl62ouxqrofu647e44wt7s2iaqjn7bra?filename=bafkreicafxt3zr4cshf7qteztjzl62ouxqrofu647e44wt7s2iaqjn7bra
 * bafkreif4ufrfpfcmqn5ltjvmeisgv4k7ykqz2mjygpngtwt4bijxosidqa  - image/svg+xml   - https://bafkreif4ufrfpfcmqn5ltjvmeisgv4k7ykqz2mjygpngtwt4bijxosidqa.ipfs.dweb.link/?filename=Web3.Storage-logo.svg
 * bafybeiekildl23opzqcsufewlbadhbabs6pyqg35tzpfavgtjyhchyikxa  - video/quicktime - https://bafybeiekildl23opzqcsufewlbadhbabs6pyqg35tzpfavgtjyhchyikxa.ipfs.dweb.link
 * bafkreiezuss4xkt5gu256vjccx7vocoksxk77vwmdrpwoumfbbxcy2zowq  - video/webm (147.78 KiB)    - https://bafkreiezuss4xkt5gu256vjccx7vocoksxk77vwmdrpwoumfbbxcy2zowq.ipfs.dweb.link
 * bafybeierkpfmf4vhtdiujgahfptiyriykoetxf3rmd3vcxsdemincpjoyu  - video/mp4 (2.80 MiB)    - https://bafybeierkpfmf4vhtdiujgahfptiyriykoetxf3rmd3vcxsdemincpjoyu.ipfs.dweb.link
 * QmbGtJg23skhvFmu9mJiePVByhfzu5rwo74MEkVDYAmF5T - video (160MiB)
 * /ipns/k51qzi5uqu5dlvj2baxnqndepeb86cbk3ng7n3i46uzyxzyqj2xjonzllnv0v8 -
 * /ipns/libp2p.io/
 */

/**
 *
 * Test CIDs
 * QmbGtJg23skhvFmu9mJiePVByhfzu5rwo74MEkVDYAmF5T
 *
 */

function ValidationMessage ({ cid, requestPath, pathNamespacePrefix, children }): JSX.Element {
  let errorElement: JSX.Element | null = null
  if (requestPath == null || requestPath === '') {
    errorElement = <span>Nothing to render yet. Enter an IPFS Path</span> // bafkreiezuss4xkt5gu256vjccx7vocoksxk77vwmdrpwoumfbbxcy2zowq
  } else if (pathNamespacePrefix !== 'ipfs' && pathNamespacePrefix !== 'ipns') {
    errorElement = <span>Not a valid IPFS or IPNS path. Use the format <pre className="di">/ip(f|n)s/cid/path</pre>, where /path is optional</span>
  } else if (cid == null || cid === '') {
    errorElement = <span>Nothing to render yet. Add a CID to your path</span> // bafkreiezuss4xkt5gu256vjccx7vocoksxk77vwmdrpwoumfbbxcy2zowq
  } else if (pathNamespacePrefix === 'ipfs') {
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
    <span className="pb3 pa3 db bg-light-yellow">
      { errorElement }
    </span>
  </>
}

export default function InputValidator ({ requestPath }: { requestPath: string }): JSX.Element {
  /**
   * requestPath may be any of the following formats:
   *
   * * `/ipfs/${cid}[/${path}]`
   * * `/ipns/${dnsLinkDomain}[/${path}]`
   * * `/ipns/${peerId}[/${path}]`
   * * `http[s]://${cid}.ipfs.example.com[/${path}]`
   * * `http[s]://${dnsLinkDomain}.ipns.example.com[/${path}]`
   * * `http[s]://${peerId}.ipns.example.com[/${path}]`
   */
  const requestPathParts = requestPath.split('/')
  const pathNamespacePrefix = requestPathParts[1]
  const cid = requestPathParts[2]
  const cidPath = requestPathParts[3] ? `/${requestPathParts.slice(3).join('/')}` : ''
  const swPath = `/${pathNamespacePrefix}/${cid ?? ''}${cidPath ?? ''}`

  return (
    <div>
      <ValidationMessage pathNamespacePrefix={pathNamespacePrefix} cid={cid} requestPath={requestPath}>

        <a className="db" href={swPath} target="_blank">
          <button id="load-directly" className='button-reset pv3 tc bn bg-animate bg-black-80 hover-bg-aqua white pointer w-100'>Load content</button>
        </a>

      </ValidationMessage>
    </div>
  )
}
