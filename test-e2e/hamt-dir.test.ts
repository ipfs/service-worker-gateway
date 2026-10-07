import { test, expect } from './fixtures/config-test-fixtures.ts'
import { loadBypassingMediaViewer } from './fixtures/media-viewer.ts'

test.describe('hamt-dir', () => {
  test('can open UnixFS file from HAMT-sharded directory', async ({ page, baseURL }) => {
    const cid = 'bafybeidbclfqleg2uojchspzd4bob56dqetqjsj27gy2cq3klkkgxtpn4i'
    const path = '685.txt'

    const response = await loadBypassingMediaViewer(page, `${baseURL}/ipfs/${cid}/${path}`)

    expect(response.status()).toBe(200)

    const headers = await response.allHeaders()
    expect(headers?.['content-type']).toContain('text/plain')
    expect(headers?.['cache-control']).toBe('public, max-age=29030400, immutable')

    const bodyBuffer = await response?.body()
    expect(bodyBuffer?.byteLength).toBe(1026)
  })

  test('can show a preview of a shard', async ({ page, baseURL }) => {
    const cid = 'bafybeidbclfqleg2uojchspzd4bob56dqetqjsj27gy2cq3klkkgxtpn4i'
    const subshard = '00'
    const path = '6E470.txt'

    const response = await loadWithServiceWorker(page, `${baseURL}/ipfs/${cid}/${subshard}/${path}`)

    expect(response.status()).toBe(200)

    const headers = await response.allHeaders()
    expect(headers?.['content-type']).toContain('text/plain')
    expect(headers?.['cache-control']).toBe('public, max-age=29030400, immutable')

    const bodyBuffer = await response?.body()
    expect(bodyBuffer?.byteLength).toBe(1026)
  })
})
