import { CID } from 'multiformats'
import { test, expect } from './fixtures/config-test-fixtures.ts'
import { loadWithServiceWorker } from './fixtures/load-with-service-worker.ts'

test.describe('_redirects', () => {
  test('should make redirect', async ({ page, baseURL, protocol, host }) => {
    const cid = 'QmYBhLYDwVFvxos9h8CGU2ibaY66QNgv8hpfewxaQrPiZj'
    const response = await loadWithServiceWorker(page, `${baseURL}/ipfs/${cid}/redirect-one`)
    expect(response.status()).toBe(200)

    const headers = response.headers()
    expect(headers['content-type']).toContain('text/html; charset=utf-8')
    expect(headers['cache-control']).toBe('public, max-age=29030400, immutable')

    expect(await response.text()).toContain('my one')
    expect(response.url()).toContain(`${protocol}//${CID.parse(cid).toV1()}.ipfs.${host}/one.html`)
  })

  test('should make redirect with wildcard', async ({ page, baseURL, protocol, host }) => {
    const cid = 'bafybeiesjgoros75o5meijhfvnxmy7kzkynhqijlzmypw3nry6nvsjqkzy'
    const response = await loadWithServiceWorker(page, `${baseURL}/ipfs/${cid}/unavail/has-no-redirects-entry`)
    expect(response.status()).toBe(451)

    const headers = response.headers()
    expect(headers['content-type']).toContain('text/html; charset=utf-8')
    expect(headers['location']).toContain(`${protocol}//${cid}.ipfs.${host}/451.html`)
  })
})
