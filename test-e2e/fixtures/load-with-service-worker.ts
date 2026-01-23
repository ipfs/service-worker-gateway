import { readFileSync } from 'node:fs'
import { peerIdFromString } from '@libp2p/peer-id'
import { base32 } from 'multiformats/bases/base32'
import { base36 } from 'multiformats/bases/base36'
import { CID } from 'multiformats/cid'
import { QUERY_PARAMS } from '../../src/lib/constants.js'
import { dnsLinkLabelEncoder } from '../../src/lib/dns-link-labels.ts'
import type { Page, Response } from 'playwright'

export interface LoadWithServiceWorkerOptions {
  /**
   * Specify the final URL here, if different to `resource`
   */
  redirect?: string

  /**
   * See Playwright Page.goto args
   */
  referer?: string

  /**
   * See Playwright Page.goto args
   */
  timeout?: number

  /**
   * See Playwright Page.goto args
   */
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit'
}

const DOWNLOAD_CONTENT_TYPES: string[] = [
  'application/vnd.ipld.dag-json',
  'application/vnd.ipld.dag-cbor',
  'application/vnd.ipld.dag-pb',
  'application/vnd.ipld.car',
  'application/vnd.ipld.raw',
  'application/cbor',
  'application/octet-stream',
  'application/x-tar'
]

const DOWNLOAD_ENCODINGS: string[] = [
  'gzip'
]

async function wasDownloaded (response: Response): Promise<boolean> {
  const contentType = await response.headerValue('content-type')

  // if the browser downloaded the file, stream the download back to
  // the conformance test client, otherwise just send the response
  // body
  if (contentType != null && DOWNLOAD_CONTENT_TYPES.includes(contentType)) {
    return true
  }

  const encoding = await response.headerValue('accept-encoding')

  if (encoding != null && DOWNLOAD_ENCODINGS.includes(encoding)) {
    return true
  }

  // check content disposition - attachment means it was downloaded, inline or
  // absent means the browser displayed it
  const disposition = await response.headerValue('content-disposition')

  if (disposition?.includes('attachment') === true) {
    return true
  }

  return false
}

function maybeAsSubdomainUrlRedirect (resource: string): string {
  const url = new URL(resource)

  // a path gateway request
  if (url.hostname === '127.0.0.1') {
    throw new Error('Path gateway requests are unsupported, please convert to localhost')
  }

  // already a subdomain request
  if (url.hostname.includes('.ipfs.') || url.hostname.includes('.ipns.')) {
    return resource
  }

  let [
    ,
    protocol,
    name,
    ...rest
  ] = url.pathname.split('/')

  if (protocol === 'ipfs') {
    name = CID.parse(name).toV1().toString(base32)
  } else if (protocol === 'ipns') {
    try {
      name = peerIdFromString(name).toCID().toString(base36)
    } catch {
      // treat as dnslink
      name = dnsLinkLabelEncoder(name)
    }
  } else {
    // don't know what this protocol is
    return resource
  }

  let path = `${rest.length > 0 ? '/' : ''}${rest.join('/')}`

  if (!path.startsWith('/')) {
    path = `/${path}`
  }

  return `http://${name}.${protocol}.${url.host}${path}${url.search}${url.hash}`
}

/**
 * Navigates to the passed resource and waits for a response from the service
 * worker that does not include a URL param to redirect to
 */
export async function loadWithServiceWorker (page: Page, resource: string, options?: LoadWithServiceWorkerOptions): Promise<Response> {
  let expected = resource

  if (options?.redirect != null) {
    expected = options.redirect
  } else {
    try {
      expected = maybeAsSubdomainUrlRedirect(resource)
    } catch {}
  }

  const downloadPromise = page.waitForEvent('download')
    .catch(() => {})

  const [
    response
  ] = await Promise.all([
    page.waitForResponse(async (response) => {
      let url = response.url()

      if (url.includes('*') && expected.includes('%2A')) {
        // this doesn't always get escaped?
        url = url.replaceAll('*', '%2A')
      }

      // ignore responses from the UI
      // if (!response.fromServiceWorker()) { <-- does not work in Firefox :(
      if (response.headers()['server']?.includes('@helia/service-worker-gateway') !== true) {
        return false
      }

      // ignore redirects by param
      if (new URL(url).searchParams.has(QUERY_PARAMS.REDIRECT)) {
        return false
      }

      // ignore redirects by status
      if (response.status() > 299 && response.status() < 400) {
        return false
      }

      const location = await response.headerValue('location')

      // ignore redirects by header
      if (location != null) {
        return false
      }

      if (url === expected) {
        return true
      }

      const expectedUrl = new URL(expected)
      const gotUrl = new URL(url)

      if (expectedUrl.protocol !== gotUrl.protocol || expectedUrl.host !== gotUrl.host || expectedUrl.search !== gotUrl.search) {
        return false
      }

      // protocol, host and query all match, normalise path to have trailing
      // slash and compare
      let expectedPath = expectedUrl.pathname
      let gotPath = gotUrl.pathname

      if (!expectedPath.endsWith('/')) {
        expectedPath = `${expectedPath}/`
      }

      if (!gotPath.endsWith('/')) {
        gotPath = `${gotPath}/`
      }

      if (expectedPath === gotPath) {
        expected = url
        return true
      }

      return false
    }, options),
    page.goto(resource, options)
      .catch((err) => {
        const message = `${err?.message?.toLowerCase()}`

        if (message.includes('is interrupted by another navigation to')) {
          // accepting the origin isolation warning can interrupt the page load
          return
        } else if (message.includes('download is starting')) {
          // requesting content in a format that causes a download can interrupt
          // the page load
          return
        }

        throw err
      })
  ])

  if (await wasDownloaded(response)) {
    const download = await downloadPromise

    if (download == null) {
      throw new Error('Download was null after awaiting')
    }

    const buf = readFileSync(await download.path())
    response.body = async () => buf
    response.text = async () => new TextDecoder().decode(await response.body())
    response.json = async () => JSON.parse(await response.text())
  } else if (page.url() !== expected) {
    // not sure why this is necessary - the response has come from the service
    // worker and is the URL we expect but it takes a little time for the page
    // to catch up?
    await page.waitForURL(expected, options)
  }

  return response
}
