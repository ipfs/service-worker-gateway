import { test, expect } from './fixtures/config-test-fixtures.js'
import { loadWithServiceWorker } from './fixtures/load-with-service-worker.ts'

test.describe('error pages', () => {
  test('it should show a message for unsupported hash algorithms', async ({ page, rootDomain, protocol }) => {
    // uses unconfigured dbl-sha2-256 algorithm
    const cid = 'bahaacvrabdhd3fzrwaambazyivoiustl2bo2c3rgweo2ug4rogcoz2apaqaa'

    const response = await loadWithServiceWorker(page, `${protocol}//${rootDomain}/ipfs/${cid}`, {
      redirect: rootDomain.includes('localhost') ? `${protocol}//${cid}.ipfs.${rootDomain}/` : undefined
    })

    expect(response.status()).toBe(500)
    expect(await response.text()).toContain('UnknownHashAlgorithmError')
  })
})
