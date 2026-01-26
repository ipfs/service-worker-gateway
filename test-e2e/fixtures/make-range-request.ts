import { Buffer } from 'node:buffer'
import { NotImplementedError } from '@libp2p/interface'
import { CID } from 'multiformats'
import { identity } from 'multiformats/hashes/identity'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { headersToObject } from '../../src/lib/headers-to-object.ts'
import { CODE_RAW } from '../../src/ui/pages/multicodec-table.ts'
import { loadWithServiceWorker } from './load-with-service-worker.ts'
import type { Page, Response } from '@playwright/test'

/**
 * Make an in-page fetch request which should get intercepted by the service
 * worker - this allows us to send headers that we can't otherwise send.
 *
 * Normally, you could use request.get in playwright to query a server, but this
 * does not go to the service worker.
 */
export async function makeFetchRequest (page: Page, url: URL | string, init?: RequestInit): Promise<Response> {
  const cid = CID.createV1(CODE_RAW, identity.digest(
    uint8ArrayFromString('<html><body></body></html>')
  ))
  await loadWithServiceWorker(page, `http://${cid}.ipfs.localhost:3000/`)

  const result = await page.evaluate(async ({ url, headers }) => {
    function headersToObject (headers: Headers): Record<string, string> {
      const output: Record<string, string> = {}

      for (const [key, value] of headers.entries()) {
        output[key] = value
      }

      return output
    }

    // TODO: replace with Uint8Array.toBase64() when it is widely available
    async function bufferToBase64 (buffer: ArrayBuffer): Promise<string> {
      const base64url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result)
          }

          reject(new Error('Result was incorrect type'))
        }
        reader.readAsDataURL(new Blob([buffer]))
      })

      return base64url.slice(base64url.indexOf(',') + 1)
    }

    const response = await fetch(url, {
      headers
    })

    let body: string | undefined

    if (response.body != null) {
      body = await bufferToBase64(await response.arrayBuffer())
    }

    return {
      status: response.status,
      statusText: response.statusText,
      url: response.url,
      headers: headersToObject(response.headers),
      body
    }
  }, { url: `${url}`, headers: headersToObject(new Headers(init?.headers)) })

  const response: Response = {
    async allHeaders () {
      return result.headers
    },
    async body () {
      if (result.body == null) {
        return Buffer.alloc(0)
      }

      return Buffer.from(result.body, 'base64')
    },
    async finished () {
      return null
    },
    frame () {
      throw new NotImplementedError('.frame() is not implemented')
    },
    fromServiceWorker () {
      return true
    },
    headers () {
      return result.headers
    },
    async headersArray () {
      return [...Object.entries(result.headers)].map(([name, value]) => ({ name, value }))
    },
    async headerValue (name) {
      return result.headers[name] ?? null
    },
    async headerValues (name) {
      return result.headers[name]?.split(',') ?? []
    },
    async json () {
      return JSON.parse(await this.text())
    },
    ok () {
      return this.status() > 199 && this.status() < 300
    },
    request () {
      throw new NotImplementedError('.request() is not implemented')
    },
    securityDetails () {
      throw new NotImplementedError('.securityDetails() is not implemented')
    },
    serverAddr () {
      throw new NotImplementedError('.serverAddr() is not implemented')
    },
    status () {
      return result.status
    },
    statusText () {
      return result.statusText
    },
    async text () {
      return new TextDecoder().decode(await this.body())
    },
    url () {
      return result.url
    }
  }

  return response
}
