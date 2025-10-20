import type { Page, Response } from '@playwright/test'

/**
 * Yields all the responses from the service worker.
 *
 * You must abort the signal to stop the capture.
 */
export async function * captureAllSwResponses (page: Page, signal: AbortSignal): AsyncGenerator<Response> {
  const responseQueue: Response[] = []
  let resolveNext: ((value: Response) => void) | null = null

  // Helper function to get the next response
  const getNextResponse = async (): Promise<Response> => {
    const response = responseQueue.shift()
    if (response != null) {
      return Promise.resolve(response)
    }
    return new Promise(resolve => {
      resolveNext = resolve
    })
  }

  // Set up the response listener
  const onResponse = (response: Response): void => {
    if (response.headers()['ipfs-sw'] !== 'true') {
      return
    }
    if (resolveNext != null) {
      resolveNext(response)
      resolveNext = null
    } else {
      responseQueue.push(response)
    }
  }
  page.on('response', onResponse)

  try {
    while (!signal.aborted) {
      const response = await getNextResponse()
      if (signal.aborted) { break }
      yield response
    }
  } finally {
    page.off('response', onResponse)
  }
}
