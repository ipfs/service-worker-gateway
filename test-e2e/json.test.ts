import { stop } from '@libp2p/interface'
import { createKuboRPCClient } from 'kubo-rpc-client'
import * as json from 'multiformats/codecs/json'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { testPathRouting as test, expect } from './fixtures/config-test-fixtures.js'
import { IPLD_CONVERSIONS } from './fixtures/ipld-conversions.ts'
import { loadWithServiceWorker } from './fixtures/load-with-service-worker.js'
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

  test('should return json block', async ({ page, protocol, rootDomain }) => {
    const response = await loadWithServiceWorker(page, `${protocol}//${rootDomain}/ipfs/${cid}?download=true`, {
      redirect: rootDomain.includes('localhost') ? `${protocol}//${cid}.ipfs.${rootDomain}?download=true` : undefined
    })

    expect(response.status()).toBe(200)

    const headers = await response.allHeaders()
    expect(headers['content-type']).toContain('application/json')
    expect(headers['cache-control']).toBe('public, max-age=29030400, immutable')

    expect(await response.json()).toStrictEqual(object)
  })

  test('should return json block as raw', async ({ page, protocol, rootDomain }) => {
    const response = await loadWithServiceWorker(page, `${protocol}//${rootDomain}/ipfs/${cid}?format=raw&download=true`, {
      redirect: rootDomain.includes('localhost') ? `${protocol}//${cid}.ipfs.${rootDomain}?format=raw&download=true` : undefined
    })

    expect(response.status()).toBe(200)

    const headers = await response.allHeaders()
    expect(headers['content-type']).toContain('application/vnd.ipld.raw')
    expect(headers['cache-control']).toBe('public, max-age=29030400, immutable')
    expect(headers['content-disposition']).toContain('attachment')

    expect(await response.json()).toStrictEqual(object)
  })

  for (const conversion of IPLD_CONVERSIONS) {
    // eslint-disable-next-line no-loop-func
    test(`should return json block as ${conversion.format}`, async ({ page, protocol, rootDomain }) => {
      const response = await loadWithServiceWorker(page, `${protocol}//${rootDomain}/ipfs/${cid}?format=${conversion.format}&download=true`, {
        redirect: rootDomain.includes('localhost') ? `${protocol}//${cid}.ipfs.${rootDomain}?format=${conversion.format}&download=true` : undefined
      })

      expect(response.status()).toBe(200)

      const headers = await response.allHeaders()
      expect(headers['content-type']).toContain(conversion.mediaType)
      expect(headers['cache-control']).toBe('public, max-age=29030400, immutable')
      expect(headers['content-disposition']).toContain(conversion.disposition)
      expect(headers['content-disposition']).toContain(conversion.filename(cid))

      expect(await conversion.decode(response)).toStrictEqual(object)
    })
  }

  test('should load json file with raw codec as application/json without headers', async ({ page, protocol, rootDomain }) => {
    const body = '{ "test": "i am a plain json file" }\n'
    const cid = await kubo.block.put(uint8ArrayFromString(body), {
      format: 'raw'
    })

    expect(cid.toString()).toContain('bafkreibrppizs3g7axs2jdlnjua6vgpmltv7k72l7v7sa6mmht6mne3qqe')

    const response = await loadWithServiceWorker(page, `${protocol}//${rootDomain}/ipfs/${cid}?format=json&download=true`, {
      redirect: rootDomain.includes('localhost') ? `${protocol}//${cid}.ipfs.${rootDomain}?format=json&download=true` : undefined
    })

    expect(response.status()).toBe(200)

    const headers = await response.allHeaders()
    expect(headers['content-type']).toContain('application/json')
    expect(headers['cache-control']).toBe('public, max-age=29030400, immutable')

    expect(await response.text()).toStrictEqual(body)
  })
})
