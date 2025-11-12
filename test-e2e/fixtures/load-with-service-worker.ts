import { QUERY_PARAMS } from '../../src/lib/constants.js'
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
   * SeemPlaywright Page.goto args
   */
  timeout?: number

  /**
   * See Playwright Page.goto args
   */
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit'
}

/**
 * Navigates to the passed resource and waits for a response from the service
 * worker that does not include a URL param to redirect to
 */
export async function loadWithServiceWorker (page: Page, resource: string, options?: LoadWithServiceWorkerOptions): Promise<Response> {
  const expected = options?.redirect ?? resource

  const [
    response
  ] = await Promise.all([
    page.waitForResponse((response) => {
      // ignore responses from the UI
      // if (!response.fromServiceWorker()) {  <-- does not work in Firefox :(
      if (response.headers()['server']?.includes('@helia/service-worker-gateway') !== true) {
        return false
      }

      // ignore redirects by param
      if (new URL(response.url()).searchParams.has(QUERY_PARAMS.REDIRECT)) {
        return false
      }

      // ignore redirects by status
      if (response.status() > 299 || response.status() < 200) {
        return false
      }

      return response.url() === expected
    }, options),
    page.goto(resource, options)
  ])

  // not sure why this is necessary - the response has come from the service
  // worker and is the URL we expect but it takes a little time for the page to
  // catch up?
  if (page.url() !== expected) {
    await page.waitForURL(options?.redirect ?? resource, options)
  }

  return response
}
