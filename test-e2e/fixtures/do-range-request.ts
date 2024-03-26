import type { Page } from '@playwright/test'

export interface RangeRequestResult {
  byteSize: number
  /**
   * playwright doesn't provide a way to get the raw bytes, so we have to convert the ArrayBuffer to an array of numbers
   */
  bytes: number[]
  headers: Record<string, string>
  statusCode: number
  text: string
}

/**
 * Normally, you could use request.get in playwright to query a server, but this does not go to the service worker
 */
export async function doRangeRequest ({ page, range, path }: { range: string, page: Page, path: string }): Promise<RangeRequestResult> {
  return page.evaluate(async ({ path, range }) => {
    const response = await fetch(path, { headers: { range } })
    const clone = response.clone()
    const buffer = await response.arrayBuffer()
    const byteSize = buffer.byteLength
    const bytes = Array.from(new Uint8Array(buffer))
    const text = await clone.text()
    const statusCode = response.status
    const headers = {}
    response.headers.forEach((value, key) => {
      headers[key] = value
    })

    return {
      byteSize,
      bytes,
      headers,
      statusCode,
      text
    }
  }, { path, range })
}
