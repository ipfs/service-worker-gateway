import { stop } from '@libp2p/interface'
import { createKuboRPCClient } from 'kubo-rpc-client'
import * as json from 'multiformats/codecs/json'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { test, expect } from './fixtures/config-test-fixtures.ts'
import { loadWithServiceWorker } from './fixtures/load-with-service-worker.ts'
import { makeFetchRequest } from './fixtures/make-fetch-request.ts'
import type { KuboRPCClient } from 'kubo-rpc-client'
import type { CID } from 'multiformats/cid'

const object = {
  hello: 'world'
}

test.describe('json', () => {
  let kubo: KuboRPCClient
  let cid: CID
  let block: Uint8Array

  test.beforeEach(async () => {
    kubo = createKuboRPCClient(process.env.KUBO_RPC)

    block = json.encode(object)
    cid = await kubo.block.put(block, {
      format: 'json'
    })
  })

  test.afterEach(async () => {
    await stop(kubo)
  })

  test('should return json block', async ({ page, baseURL }) => {
    const response = await loadWithServiceWorker(page, `${baseURL}/ipfs/${cid}?download=true`)

    expect(response.status()).toBe(200)

    const headers = await response.allHeaders()
    expect(headers['content-type']).toContain('application/json')
    expect(headers['cache-control']).toBe('public, max-age=29030400, immutable')

    expect(await response.json()).toStrictEqual(object)
  })

  test('should return json block as raw', async ({ page, baseURL }) => {
    const response = await loadWithServiceWorker(page, `${baseURL}/ipfs/${cid}?format=raw&download=true`)

    expect(response.status()).toBe(200)

    const headers = await response.allHeaders()
    expect(headers['content-type']).toContain('application/vnd.ipld.raw')
    expect(headers['cache-control']).toBe('public, max-age=29030400, immutable')
    expect(headers['content-disposition']).toContain('attachment')

    expect(await response.json()).toStrictEqual(object)
  })

  test('should load json file with raw codec as application/json without headers', async ({ page, baseURL }) => {
    const body = '{ "test": "i am a plain json file" }\n'
    const cid = await kubo.block.put(uint8ArrayFromString(body), {
      format: 'raw'
    })

    expect(cid.toString()).toContain('bafkreibrppizs3g7axs2jdlnjua6vgpmltv7k72l7v7sa6mmht6mne3qqe')

    const response = await loadWithServiceWorker(page, `${baseURL}/ipfs/${cid}?format=json&download=true`)

    expect(response.status()).toBe(200)

    const headers = await response.allHeaders()
    expect(headers['content-type']).toContain('application/json')
    expect(headers['cache-control']).toBe('public, max-age=29030400, immutable')

    expect(await response.text()).toStrictEqual(body)
  })

  test('should load json file as HTML via accept header', async ({ page, baseURL }) => {
    const body = '{ "test": "i am a plain json file" }\n'
    const cid = await kubo.block.put(uint8ArrayFromString(body), {
      format: 'raw'
    })

    expect(cid.toString()).toContain('bafkreibrppizs3g7axs2jdlnjua6vgpmltv7k72l7v7sa6mmht6mne3qqe')
    await page.goto(`${baseURL}`, {
      waitUntil: 'networkidle'
    })

    const response = await makeFetchRequest(page, `${baseURL}/ipfs/${cid}`, {
      headers: {
        accept: 'text/html'
      }
    })
    expect(response.status()).toBe(200)

    const headers = await response.allHeaders()
    expect(headers['content-type']).toContain('text/html')
    expect(headers['cache-control']).toBe('public, max-age=604800, stale-while-revalidate=2678400')
  })
})
