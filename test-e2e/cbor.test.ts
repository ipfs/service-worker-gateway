import { stop } from '@libp2p/interface'
import * as cbor from 'cborg'
import { createKuboRPCClient } from 'kubo-rpc-client'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { CURRENT_CACHES } from '../src/constants.ts'
import { testPathRouting as test, expect } from './fixtures/config-test-fixtures.js'
import { hasCacheEntry } from './fixtures/has-cache-entry.ts'
import { IPLD_CONVERSIONS } from './fixtures/ipld-conversions.ts'
import { loadWithServiceWorker } from './fixtures/load-with-service-worker.js'
import type { KuboRPCClient } from 'kubo-rpc-client'
import type { CID } from 'multiformats/cid'

const object = {
  hello: 'world'
}

test.describe('cbor', () => {
  let kubo: KuboRPCClient
  let cid: CID
  let block: Uint8Array

  test.beforeEach(async () => {
    kubo = createKuboRPCClient(process.env.KUBO_RPC)

    block = cbor.encode(object)
    cid = await kubo.block.put(block, {
      format: 'cbor'
    })
  })

  test.afterEach(async () => {
    await stop(kubo)
  })

  test('should return cbor block', async ({ page, protocol, rootDomain }) => {
    const response = await loadWithServiceWorker(page, `${protocol}//${rootDomain}/ipfs/${cid}?download=true`, {
      redirect: rootDomain.includes('localhost') ? `${protocol}//${cid}.ipfs.${rootDomain}?download=true` : undefined
    })

    expect(response.status()).toBe(200)

    const headers = await response.allHeaders()
    expect(headers['content-type']).toContain('application/vnd.ipld.dag-cbor')
    expect(headers['cache-control']).toBe('public, max-age=29030400, immutable')
    expect(headers['content-disposition']).toContain('attachment')

    expect(cbor.decode(await response?.body())).toStrictEqual(object)
  })

  test('should return cbor block as raw', async ({ page, protocol, rootDomain }) => {
    const response = await loadWithServiceWorker(page, `${protocol}//${rootDomain}/ipfs/${cid}?format=raw&download=true`, {
      redirect: rootDomain.includes('localhost') ? `${protocol}//${cid}.ipfs.${rootDomain}?format=raw&download=true` : undefined
    })

    expect(response.status()).toBe(200)

    const headers = await response.allHeaders()
    expect(headers['content-type']).toContain('application/vnd.ipld.raw')
    expect(headers['cache-control']).toBe('public, max-age=29030400, immutable')
    expect(headers['content-disposition']).toContain('attachment')

    expect(cbor.decode(await response?.body())).toStrictEqual(object)
  })

  test('should return range of cbor block', async ({ page, protocol, rootDomain }) => {
    const cid = 'bafireif3aymeikgfbofx533yf5vlx4kimzq6zmzmpra2mnzfsfnmv4hchm'

    const response = await loadWithServiceWorker(page, `${protocol}//${rootDomain}/ipfs/${cid}?range=${encodeURIComponent('bytes=7-9')}`, {
      redirect: rootDomain.includes('localhost') ? `${protocol}//${cid}.ipfs.${rootDomain}?range=${encodeURIComponent('bytes=7-9')}` : undefined
    })
    expect(response.status()).toBe(200)
    expect(await response.headerValue('content-disposition')).toContain('attachment')
    expect(await response.headerValue('content-range')).toContain('bytes 7-9/17')
    expect(new Uint8Array(await response.body())).toStrictEqual(uint8ArrayFromString('pla'))

    // partial response should not be cached
    expect(await hasCacheEntry(page, CURRENT_CACHES.mutable, cid)).toBeFalsy()
    expect(await hasCacheEntry(page, CURRENT_CACHES.immutable, cid)).toBeFalsy()
  })

  test('should convert cbor to json and return range of', async ({ page, protocol, rootDomain }) => {
    const cid = 'bafyreibs4utpgbn7uqegmd2goqz4bkyflre2ek2iwv743fhvylwi4zeeim'

    const response = await loadWithServiceWorker(page, `${protocol}//${rootDomain}/ipfs/${cid}?format=dag-json&range=${encodeURIComponent('bytes=7-9')}`, {
      redirect: rootDomain.includes('localhost') ? `${protocol}//${cid}.ipfs.${rootDomain}?format=dag-json&range=${encodeURIComponent('bytes=7-9')}` : undefined
    })
    expect(response.status()).toBe(200)
    expect(await response.headerValue('content-disposition')).toContain('inline')
    expect(await response.headerValue('content-range')).toContain('bytes 7-9/122')
    expect(new Uint8Array(await response.body())).toStrictEqual(uint8ArrayFromString('{"l'))

    // partial response should not be cached
    expect(await hasCacheEntry(page, CURRENT_CACHES.mutable, cid)).toBeFalsy()
    expect(await hasCacheEntry(page, CURRENT_CACHES.immutable, cid)).toBeFalsy()
  })

  for (const conversion of IPLD_CONVERSIONS) {
    // eslint-disable-next-line no-loop-func
    test(`should return cbor block as ${conversion.format}`, async ({ page, protocol, rootDomain }) => {
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
})
