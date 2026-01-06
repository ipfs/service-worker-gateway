import { readFileSync } from 'node:fs'
import { QUERY_PARAMS } from '../../src/lib/constants.js'
import type { Page, Response } from 'playwright'

const ORIGIN_ISOLATION_WARNING = '.e2e-subdomain-warning'
const ACCEPT_ORIGIN_ISOLATION_WARNING = '#accept-warning'

export interface LoadWithServiceWorkerOptions {
  /**
   * Specify the final URL here, if different to `resource`
   */
  redirect?: string

  /**
   * The origin isolation warning will be accepted automatically, pass `false`
   * here to do it manually
   *
   * @default true
   */
  acceptOriginIsolationWarning?: boolean

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

/**
 * Navigates to the passed resource and waits for a response from the service
 * worker that does not include a URL param to redirect to
 */
export async function loadWithServiceWorker (page: Page, resource: string, options?: LoadWithServiceWorkerOptions): Promise<Response> {
  const expected = options?.redirect ?? resource
  const downloadPromise = page.waitForEvent('download')
    .catch(() => {})

  if (options?.acceptOriginIsolationWarning !== false) {
    // accept origin isolation warning if it appears
    page.on('load', (page) => {
      Promise.resolve()
        .then(async () => {
          await page.waitForSelector(ORIGIN_ISOLATION_WARNING, {
            timeout: 5_000
          })
          await page.click(ACCEPT_ORIGIN_ISOLATION_WARNING)
        })
        .catch(() => {})
    })
  }

  const [
    response
  ] = await Promise.all([
    page.waitForResponse((response) => {
      // ignore responses from the UI
      // if (!response.fromServiceWorker()) { <-- does not work in Firefox :(
      if (response.headers()['server']?.includes('@helia/service-worker-gateway') !== true) {
        return false
      }

      // ignore redirects by param
      if (new URL(response.url()).searchParams.has(QUERY_PARAMS.REDIRECT)) {
        return false
      }

      // ignore redirects by status
      if (response.status() > 299 && response.status() < 400) {
        return false
      }

      return response.url() === expected
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
