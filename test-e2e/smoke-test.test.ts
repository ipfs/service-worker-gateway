// see https://github.com/ipfs/service-worker-gateway/issues/502

import { testSubdomainRouting as test, expect } from './fixtures/config-test-fixtures.js'
import { navigateAndGetSwResponse } from './fixtures/navigate-and-get-last-response'

test.describe('smoke test', () => {
  test('loads a dag-json jpeg', async ({ page, protocol }) => {
    const response = await navigateAndGetSwResponse(page, {
      url: `${protocol}//localhost:3334/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi`,
      swScope: 'http://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi.ipfs.localhost:3334'
    })

    expect(response?.status()).toBe(200)
    expect(response?.headers()['content-type']).toBe('image/jpeg')
  })

  test('request to /ipfs/dir-cid redirect to /ipfs/dir-cid/', async ({ page, protocol }) => {
    await navigateAndGetSwResponse(page, {
      url: `${protocol}//localhost:3334/ipfs/bafybeib3ffl2teiqdncv3mkz4r23b5ctrwkzrrhctdbne6iboayxuxk5ui/root2/root3/root4`,
      swScope: 'http://bafybeib3ffl2teiqdncv3mkz4r23b5ctrwkzrrhctdbne6iboayxuxk5ui.ipfs.localhost:3334'
    })

    await page.waitForURL(`${protocol}//bafybeib3ffl2teiqdncv3mkz4r23b5ctrwkzrrhctdbne6iboayxuxk5ui.ipfs.localhost:3334/root2/root3/root4/`)
    const response = await page.reload()
    expect(response?.status()).toBe(200)
    expect(response?.headers()['content-type']).toBe('text/html; charset=utf-8')
    expect(await response?.text()).toContain('hello')
  })
})
