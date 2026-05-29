import all from 'it-all'
import { createKuboRPCClient } from 'kubo-rpc-client'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { test, expect } from './fixtures/config-test-fixtures.ts'
import { loadWithServiceWorker } from './fixtures/load-with-service-worker.ts'
import { loadBypassingMediaViewer } from './fixtures/media-viewer.ts'
import type { KuboRPCClient } from 'kubo-rpc-client'

test.describe('website-loading', () => {
  let kubo: KuboRPCClient

  test.beforeEach(async ({ page }) => {
    if (process.env.KUBO_GATEWAY == null || process.env.KUBO_GATEWAY === '') {
      throw new Error('KUBO_GATEWAY not set')
    }

    kubo = createKuboRPCClient(process.env.KUBO_RPC)
  })

  test('ensure unixfs directory trailing slash is added', async ({ page, baseURL }) => {
    const cid = 'bafybeifq2rzpqnqrsdupncmkmhs3ckxxjhuvdcbvydkgvch3ms24k5lo7q'
    const response = await loadWithServiceWorker(page, `${baseURL}/ipfs/${cid}`)

    // playwright follows redirects so we won't see the 301
    expect(response?.status()).toBe(200)
  })

  test('ensure that index.html is returned for the root path', async ({ page, baseURL }) => {
    const cid = 'bafybeifq2rzpqnqrsdupncmkmhs3ckxxjhuvdcbvydkgvch3ms24k5lo7q'
    const response = await loadWithServiceWorker(page, `${baseURL}/ipfs/${cid}/`)

    expect(response.status()).toBe(200)

    const headers = await response.allHeaders()
    expect(headers['content-type']).toContain('text/html')
    expect(headers['cache-control']).toBe('public, max-age=29030400, immutable')

    const bodyBuffer = await response?.body()
    expect(bodyBuffer?.byteLength).toBe(6)
    const bodyText = await response?.text()
    expect(bodyText).toBe('hello\n')
  })

  test('ensure query string params are retained on reload', async ({ page, baseURL }) => {
    const cid = 'bafkqablimvwgy3y'
    // First navigation: bypass the media-viewer wrapper (#574) so we can
    // assert the bare text/plain header.
    const response = await loadBypassingMediaViewer(page, `${baseURL}/ipfs/${cid}`)

    expect(response.status()).toBe(200)

    const headers = await response.allHeaders()
    expect(headers['content-type']).toContain('text/plain')

    // `?filename=index.html` makes verified-fetch return text/html, which is
    // not in the wrapper's content-type list, so this navigation renders the
    // page content directly without needing the bypass.
    const responseWithFilename = await loadWithServiceWorker(page, `${baseURL}/ipfs/${cid}?filename=index.html`)

    expect(responseWithFilename?.status()).toBe(200)
    const headersWithFilename = await responseWithFilename?.allHeaders()
    expect(headersWithFilename?.['content-type']).toContain('text/html')

    const responseAfterReloading = await page.reload({
      waitUntil: 'networkidle'
    })
    expect(responseAfterReloading?.status()).toBe(200)
    const headersAfterReloading = await responseAfterReloading?.allHeaders()
    expect(headersAfterReloading?.['content-type']).toContain('text/html')
  })

  test('ensure URL fragments are available to the target page', async ({ page, baseURL, port }) => {
    const [, { cid }] = await all(kubo.addAll([{
      path: '/index.html',
      content: uint8ArrayFromString(`<html>
  <body data-testid="body">
    <script type="text/javascript">
        document.write(document.location)
    </script>
  </body>
</html>`)
    }], {
      wrapWithDirectory: true,
      cidVersion: 1
    }))

    const response = await loadWithServiceWorker(page, `${baseURL}/ipfs/${cid}#a-url-fragment`)
    expect(response.status()).toBe(200)

    await expect(page.getByTestId('body')).toHaveText(`http://${cid}.ipfs.localhost:${port}/#a-url-fragment`)
  })
})
